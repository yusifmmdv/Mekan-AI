import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { DemoGallery } from "@/components/demo-gallery";
export const metadata = { title: "Ev, ofis və studiya — AI nümunələri" };
export default async function Examples({ searchParams }: { searchParams: Promise<{ space?: string }> }) {
  const { space } = await searchParams;
  return <div className="container demo-page">
    <div className="page-title"><div className="eyebrow">Mekan AI · İnteraktiv nümunələr</div><h1>Bir məkan.<br />Üç yeni hekayə.</h1><p>Boş otağın evə, ofisə və yaradıcı studiyaya çevrilməsini kəşf edin. Mebelin üzərinə gəlin, oxşar məhsulların qiymətini və satıcısını görün.</p><Link href="/studio" className="btn" style={{ marginTop: 24 }}>Öz otağını dizayn et <ArrowUpRight size={18} aria-hidden="true" /></Link></div>
    <DemoGallery initialSample={space} />
  </div>;
}
