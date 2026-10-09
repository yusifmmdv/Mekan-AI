import { pageUser } from "@/lib/auth";
import RoomEditor from "@/components/room-editor/editor";
export const metadata = {
  title: "İnteraktiv otaq redaktoru",
  robots: { index: false, follow: false },
};
export default async function RoomEditorPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; imageId?: string }>;
}) {
  await pageUser();
  const query = await searchParams;
  return (
    <RoomEditor
      initialId={typeof query.id === "string" ? query.id : undefined}
      initialImageId={
        typeof query.imageId === "string" ? query.imageId : undefined
      }
    />
  );
}
