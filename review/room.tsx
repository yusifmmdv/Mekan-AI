import { ShoppableRoom as ProductRoom } from "../components/shoppable-room";
import type { ComponentProps } from "react";
import { asset } from "./links";

export function ShoppableRoom(props: ComponentProps<typeof ProductRoom>) {
  return <ProductRoom {...props} before={asset(props.before)} after={asset(props.after)} products={props.products.map(product => ({ ...product, image: asset(product.image) }))} />;
}
