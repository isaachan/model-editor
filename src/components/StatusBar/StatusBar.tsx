import { useDiagramStore } from '@/store/useDiagramStore';
import { useEditorStore } from '@/store/useEditorStore';

export function StatusBar() {
  const elementCount = useDiagramStore((s) => s.elements.length);
  const selectedCount = useEditorStore((s) => s.selectedIds.length);
  const tool = useEditorStore((s) => s.currentTool);
  const scale = useEditorStore((s) => s.viewport.scale);

  return (
    <footer
      className="flex h-7 items-center gap-4 border-t px-4 text-xs"
      style={{
        borderColor: 'var(--color-separator)',
        background: 'var(--glass-bg)',
        color: 'var(--color-text-secondary)',
      }}
    >
      <span>Elements: {elementCount}</span>
      <span>Selected: {selectedCount}</span>
      <span>Zoom: {Math.round(scale * 100)}%</span>
      <span className="ml-auto capitalize">Tool: {tool}</span>
    </footer>
  );
}
