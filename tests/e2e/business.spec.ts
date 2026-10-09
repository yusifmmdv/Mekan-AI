import {test,expect,type APIRequestContext,type Page} from '@playwright/test';
import {Pool} from 'pg';
import {randomUUID} from 'node:crypto';
import sharp from 'sharp';
import {unlink} from 'node:fs/promises';
import path from 'node:path';
const pool=new Pool({connectionString:process.env.DATABASE_URL});
const origin=new URL(process.env.APP_URL||'http://127.0.0.1:3000').origin;
const post=(request:APIRequestContext,endpoint:string,data:unknown)=>request.post(`/api/${endpoint}`,{data,headers:{origin}});
const emails:string[]=[];
async function register(request:APIRequestContext,role:'CUSTOMER'|'REALTOR'='CUSTOMER'){
 const email=`business_${randomUUID()}@example.test`;emails.push(email);const response=await post(request,'auth/register',{name:'Isolated QA business',email,password:`QA_${randomUUID()}!`,role});expect(response.status()).toBe(200);return (await pool.query('SELECT id FROM "User" WHERE email=$1',[email])).rows[0].id as string;
}
async function demoLogin(page:Page,role:string){await page.goto('/login');await page.getByLabel('E-poçt',{exact:false}).fill(`${role}@demo.mekan.test`);await page.getByLabel('Şifrə',{exact:false}).fill(process.env.SEED_DEMO_PASSWORD!);await page.getByRole('button',{name:'Daxil ol',exact:true}).click();await expect(page).toHaveURL(/\/dashboard$/, {timeout:15000});}
test.afterAll(async()=>{
 for(const email of emails){const u=(await pool.query('SELECT id FROM "User" WHERE email=$1',[email])).rows[0];if(!u)continue;
 const assets=(await pool.query('SELECT key FROM "ImageAsset" WHERE "ownerId"=$1',[u.id])).rows;
 await pool.query('DELETE FROM "VirtualStagingProject" WHERE "userId"=$1',[u.id]);await pool.query('DELETE FROM "DesignGeneration" WHERE "projectId" IN (SELECT id FROM "DesignProject" WHERE "userId"=$1)',[u.id]);await pool.query('DELETE FROM "DesignProject" WHERE "userId"=$1',[u.id]);await pool.query('DELETE FROM "PropertyImage" WHERE "propertyId" IN (SELECT id FROM "Property" WHERE "userId"=$1)',[u.id]);await pool.query('DELETE FROM "Property" WHERE "userId"=$1',[u.id]);await pool.query('DELETE FROM "ImageAsset" WHERE "ownerId"=$1',[u.id]);for(const a of assets)await unlink(path.resolve(process.env.STORAGE_PATH||'.storage',a.key)).catch(()=>{});
 await pool.query('DELETE FROM "AuditLog" WHERE "targetId" IN (SELECT id FROM "Payment" WHERE "userId"=$1)',[u.id]);await pool.query('DELETE FROM "Subscription" WHERE "userId"=$1',[u.id]);await pool.query('DELETE FROM "Payment" WHERE "userId"=$1',[u.id]);await pool.query('DELETE FROM "CreditTransaction" WHERE "walletId" IN (SELECT id FROM "CreditWallet" WHERE "userId"=$1)',[u.id]);await pool.query('DELETE FROM "CreditWallet" WHERE "userId"=$1',[u.id]);await pool.query('DELETE FROM "User" WHERE id=$1',[u.id]);
 }await pool.end();
});
test('TEST billing record: admin manual confirmation grants credits once and audits command',async({page,browser})=>{
 test.skip(!process.env.SEED_DEMO_PASSWORD,'Requires demo seed');const context=await browser.newContext();const userId=await register(context.request);
 try{const plan=(await pool.query('SELECT id,credits FROM "SubscriptionPlan" WHERE role=\'CUSTOMER\' AND active=true AND sample=true LIMIT 1')).rows[0];expect(plan).toBeTruthy();
 const requested=await post(context.request,'billing/request',{planId:plan.id,key:randomUUID()});expect(requested.status()).toBe(200);const payment=(await requested.json()).data;expect(payment.status).toBe('PENDING');expect((await pool.query('SELECT balance FROM "CreditWallet" WHERE "userId"=$1',[userId])).rows[0].balance).toBe(0);
 expect((await post(context.request,'admin',{action:'payment',targetId:payment.id,data:{status:'CONFIRMED',reference:'TEST_NO_REAL_PAYMENT'}})).status()).toBe(403);
 await demoLogin(page,'admin');const body={action:'payment',targetId:payment.id,data:{status:'CONFIRMED',reference:`TEST_NO_REAL_PAYMENT_${randomUUID()}`}};
 // This isolated test exercises the administrative command. No money has moved.
 expect((await post(page.request,'admin',body)).status()).toBe(200);expect((await post(page.request,'admin',body)).status()).toBe(200);
 expect((await pool.query('SELECT balance FROM "CreditWallet" WHERE "userId"=$1',[userId])).rows[0].balance).toBe(plan.credits);expect((await pool.query('SELECT count(*)::int AS count FROM "Subscription" WHERE "userId"=$1',[userId])).rows[0].count).toBe(1);expect((await pool.query('SELECT count(*)::int AS count FROM "AuditLog" WHERE "targetId"=$1 AND action=\'payment\'',[payment.id])).rows[0].count).toBe(1);
 }finally{await context.close();}
});
test('realtor creates a property and private staging project; customer cannot reuse private asset',async({browser})=>{
 const realtor=await browser.newContext();const customer=await browser.newContext();await register(realtor.request,'REALTOR');await register(customer.request);
 try{const propertyResponse=await post(realtor.request,'properties',{title:'QA empty apartment',location:'Bakı QA',type:'Apartment',roomCount:2,area:70,description:'Isolated test',imageIds:[]});expect(propertyResponse.status()).toBe(200);const property=(await propertyResponse.json()).data;
 const png=await sharp({create:{width:64,height:64,channels:3,background:'#eee'}}).png().toBuffer();const upload=await realtor.request.post('/api/uploads',{headers:{origin},multipart:{purpose:'PROPERTY',file:{name:'empty.png',mimeType:'image/png',buffer:png}}});expect(upload.status()).toBe(200);const asset=(await upload.json()).data;
 const body={title:'QA staging',imageId:asset.id,propertyId:property.id,roomType:'Living room',style:'Modern',width:4,length:5,colors:['beige'],requirements:'Stage empty room',budget:1000};expect((await post(customer.request,'projects',body)).status()).toBe(404);const response=await post(realtor.request,'projects',body);expect(response.status()).toBe(200);const project=(await response.json()).data;expect((await pool.query('SELECT "propertyId" FROM "VirtualStagingProject" WHERE "designProjectId"=$1',[project.id])).rows[0].propertyId).toBe(property.id);expect((await customer.request.get(`/api/generations?projectId=${project.id}`)).status()).toBe(404);
 expect((await post(customer.request,'properties',{title:'Illegal',location:'Bakı',type:'Flat',roomCount:1,area:50,description:'test'})).status()).toBe(403);
 }finally{await realtor.close();await customer.close();}
});
test('designer manages service and completes a customer request with owner restrictions',async({page,browser})=>{
 test.skip(!process.env.SEED_DEMO_PASSWORD,'Requires demo seed');const customer=await browser.newContext();await register(customer.request);let serviceId:string|undefined,requestId:string|undefined;
 try{await demoLogin(page,'designer');const response=await post(page.request,'designer/services',{title:`QA service ${randomUUID()}`,description:'Isolated request test',price:50,active:true});expect(response.status()).toBe(200);serviceId=(await response.json()).data.id;
 const edit=await post(page.request,'designer/services',{id:serviceId,title:'QA amended service',description:'Test',price:60,active:true});expect(edit.status()).toBe(200);expect((await post(customer.request,'designer/services',{id:serviceId,title:'Illegal',description:'Test',price:1,active:true})).status()).toBe(403);
 const requested=await post(customer.request,'designer-request',{serviceId,brief:'Test room consultation request',contact:'qa@example.test'});expect(requested.status()).toBe(200);const request=(await requested.json()).data;requestId=request.id;expect(Number(request.quotedPrice)).toBe(60);
 const body={requestId,status:'COMPLETED',reply:'TEST workflow completion'};expect((await post(customer.request,'designer/requests',body)).status()).toBe(403);expect((await post(page.request,'designer/requests',body)).status()).toBe(200);expect((await post(page.request,'designer/requests',body)).status()).toBe(409);expect((await pool.query('SELECT count(*)::int AS count FROM "Commission" WHERE "requestId"=$1',[requestId])).rows[0].count).toBe(1);
 }finally{if(requestId){await pool.query('DELETE FROM "Commission" WHERE "requestId"=$1',[requestId]);await pool.query('DELETE FROM "DesignerRequest" WHERE id=$1',[requestId]);}if(serviceId)await pool.query('DELETE FROM "DesignerService" WHERE id=$1',[serviceId]);await customer.close();}
});
