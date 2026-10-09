"use client";
import { useEffect, useRef, useState } from "react";
import Konva from "konva";
import {
  Stage,
  Layer,
  Rect,
  Image as CanvasImage,
  Transformer,
} from "react-konva";
import useImage from "use-image";
import type { FurnitureLayer, RoomScene } from "@/lib/room-scene";

function Furniture({
  item,
  selected,
  onSelect,
  onChange,
}: {
  item: FurnitureLayer;
  selected: boolean;
  onSelect: () => void;
  onChange: (patch: Partial<FurnitureLayer>) => void;
}) {
  const [image] = useImage(`/editor-assets/${item.assetKey}.svg`);
  const [hovered, setHovered] = useState(false);
  const node = useRef<Konva.Image>(null);
  const transformer = useRef<Konva.Transformer>(null);
  useEffect(() => {
    if (selected && node.current && transformer.current) {
      transformer.current.nodes([node.current]);
      transformer.current.getLayer()?.batchDraw();
    }
  }, [selected, item.width, item.height]);
  return (
    <>
      <CanvasImage
        ref={node}
        name={`furniture-${item.id}`}
        image={image}
        x={item.x}
        y={item.y}
        width={item.width}
        height={item.height}
        offsetX={item.width / 2}
        offsetY={item.height / 2}
        rotation={item.rotation}
        draggable
        stroke={hovered || selected ? "#b18c32" : undefined}
        strokeWidth={hovered || selected ? 1.5 : 0}
        onClick={onSelect}
        onTap={onSelect}
        onMouseEnter={(e) => {
          setHovered(true);
          e.target.getStage()!.container().style.cursor = "grab";
        }}
        onMouseLeave={(e) => {
          setHovered(false);
          e.target.getStage()!.container().style.cursor = "default";
        }}
        onDragStart={onSelect}
        onDragEnd={(e) => {
          const position = {
            x: Math.min(1000, Math.max(0, e.target.x())),
            y: Math.min(750, Math.max(0, e.target.y())),
          };
          e.target.position(position);
          onChange(position);
        }}
        onTransformEnd={() => {
          const n = node.current;
          if (!n) return;
          const width = Math.min(1000, Math.max(8, n.width() * n.scaleX())),
            height = Math.min(1000, Math.max(8, n.height() * n.scaleY()));
          n.scaleX(1);
          n.scaleY(1);
          const x = Math.min(1000, Math.max(0, n.x())),
            y = Math.min(750, Math.max(0, n.y()));
          const rotation = ((((n.rotation() + 180) % 360) + 360) % 360) - 180;
          n.position({ x, y });
          n.width(width);
          n.height(height);
          n.offset({ x: width / 2, y: height / 2 });
          n.rotation(rotation);
          onChange({ x, y, width, height, rotation });
        }}
      />
      {selected && (
        <Transformer
          ref={transformer}
          flipEnabled={false}
          rotateEnabled
          keepRatio={false}
          anchorSize={14}
          anchorStroke="#9c7b2e"
          anchorFill="#fffaf0"
          borderStroke="#b18c32"
          padding={3}
          enabledAnchors={[
            "top-left",
            "top-right",
            "bottom-left",
            "bottom-right",
          ]}
          boundBoxFunc={(oldBox, newBox) =>
            Math.abs(newBox.width) < 16 ||
            Math.abs(newBox.height) < 16 ||
            Math.abs(newBox.width) > 1000 ||
            Math.abs(newBox.height) > 1000
              ? oldBox
              : newBox
          }
        />
      )}
    </>
  );
}
export default function RoomCanvas({
  scene,
  backgroundUrl,
  selectedId,
  onSelect,
  onChange,
  onDropProduct,
}: {
  scene: RoomScene;
  backgroundUrl: string;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onChange: (id: string, patch: Partial<FurnitureLayer>) => void;
  onDropProduct: (payload: string, position: { x: number; y: number }) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);
  const [background, imageStatus] = useImage(backgroundUrl);
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) =>
      setWidth(Math.max(1, entries[0].contentRect.width)),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const fit = background
    ? Math.min(1000 / background.width, 750 / background.height)
    : 1;
  const scale = width / 1000;
  return (
    <div
      ref={host}
      className="room-canvas"
      data-testid="room-editor-canvas"
      role="group"
      aria-label="2D otaq redaktoru. Qatları aşağıdakı siyahıdan da seçə bilərsiniz."
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        const bounds = event.currentTarget.getBoundingClientRect();
        onDropProduct(
          event.dataTransfer.getData("application/mekan-furniture"),
          {
            x: (event.clientX - bounds.left) / scale,
            y: (event.clientY - bounds.top) / scale,
          },
        );
      }}
    >
      <Stage
        width={width}
        height={width * 0.75}
        scaleX={scale}
        scaleY={scale}
        onMouseDown={(e) => {
          if (
            e.target === e.target.getStage() ||
            e.target.name() === "background"
          )
            onSelect(null);
        }}
        onTouchStart={(e) => {
          if (
            e.target === e.target.getStage() ||
            e.target.name() === "background"
          )
            onSelect(null);
        }}
      >
        <Layer listening={false}>
          <Rect width={1000} height={750} fill="#eeeae0" />
          <CanvasImage
            image={background}
            name="background"
            x={(1000 - (background?.width || 1000) * fit) / 2}
            y={(750 - (background?.height || 750) * fit) / 2}
            width={(background?.width || 1000) * fit}
            height={(background?.height || 750) * fit}
          />
        </Layer>
        <Layer>
          {scene.layers.map((item) => (
            <Furniture
              key={item.id}
              item={item}
              selected={item.id === selectedId}
              onSelect={() => onSelect(item.id)}
              onChange={(patch) => onChange(item.id, patch)}
            />
          ))}
        </Layer>
      </Stage>
      {imageStatus === "loading" && (
        <div className="room-canvas-status" role="status">
          Otaq şəkli yüklənir…
        </div>
      )}
      {imageStatus === "failed" && (
        <div className="room-canvas-status" role="alert">
          Otaq şəkli açılmadı. Hesabınızı və bağlantınızı yoxlayın.
        </div>
      )}
    </div>
  );
}
