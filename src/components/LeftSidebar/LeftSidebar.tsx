import { useEditorStore } from '@/store/useEditorStore';
import type { ToolMode } from '@/models/editor';

interface ToolDef {
  id: ToolMode;
  label: string;
  tooltip: string;
  icon: React.ReactNode;
}

const TOOLS: ToolDef[] = [
  {
    id: 'select',
    label: 'Select',
    tooltip: '选择工具',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
        <path
          d="M5 4l12 6-5 1.5L10 17 5 4z"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: 'type',
    label: 'Type',
    tooltip: '创建类型节点',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect
          x="4"
          y="7"
          width="16"
          height="10"
          stroke="currentColor"
          strokeWidth="1.5"
          fill="none"
        />
        <text
          x="12"
          y="14.5"
          textAnchor="middle"
          fontSize="6"
          fontWeight="500"
          fill="currentColor"
        >
          Type
        </text>
      </svg>
    ),
  },
  {
    id: 'relation',
    label: 'Relation',
    tooltip: '创建两个Type之间的关系连线',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="2" y="8" width="6" height="8" stroke="currentColor" strokeWidth="1.5" />
        <rect x="16" y="8" width="6" height="8" stroke="currentColor" strokeWidth="1.5" />
        <line x1="8" y1="12" x2="16" y2="12" stroke="currentColor" strokeWidth="1.5" />
        {/* crow foot hint on right end */}
        <line x1="13" y1="12" x2="16" y2="9.5" stroke="currentColor" strokeWidth="1.2" />
        <line x1="13" y1="12" x2="16" y2="14.5" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    ),
  },
];

export function LeftSidebar() {
  const currentTool = useEditorStore((s) => s.currentTool);
  const setTool = useEditorStore((s) => s.setTool);

  return (
    <aside
      className="flex w-16 flex-col items-center gap-2 border-r py-3"
      style={{ borderColor: 'var(--color-separator)', background: 'var(--glass-bg)' }}
    >
      {TOOLS.map((tool) => {
        const active = currentTool === tool.id;
        return (
          <button
            key={tool.id}
            type="button"
            title={tool.tooltip}
            aria-label={tool.tooltip}
            aria-pressed={active}
            onClick={() => setTool(tool.id)}
            className="flex h-12 w-12 items-center justify-center rounded-[14px] transition-colors"
            style={{
              color: active ? 'var(--color-accent-blue)' : 'var(--color-text-primary)',
              background: active ? 'rgba(0, 122, 255, 0.12)' : 'transparent',
              boxShadow: active ? 'inset 0 0 0 1.5px var(--color-accent-blue)' : 'none',
              transition: 'all var(--transition-fast)',
            }}
            onMouseEnter={(e) => {
              if (!active) e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)';
            }}
            onMouseLeave={(e) => {
              if (!active) e.currentTarget.style.background = 'transparent';
            }}
          >
            {tool.icon}
          </button>
        );
      })}
    </aside>
  );
}
