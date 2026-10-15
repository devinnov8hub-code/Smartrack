interface TabsProps<T extends string> {
  tabs: { id: T; label: string }[]
  value: T
  onChange: (id: T) => void
}

export function Tabs<T extends string>({ tabs, value, onChange }: TabsProps<T>) {
  return (
    <div role="tablist" className="flex h-[50px] min-w-0 flex-1 items-center gap-[17px]">
      {tabs.map((tab) => {
        const active = tab.id === value
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={`min-w-0 flex-1 rounded-full px-5 py-2.5 text-lg font-medium whitespace-nowrap transition-colors ${
              active ? 'bg-brand-soft text-brand' : 'text-muted hover:bg-black/5'
            }`}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
