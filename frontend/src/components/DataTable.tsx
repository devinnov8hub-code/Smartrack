import type { ReactNode } from 'react'
import dotDelivered from '../assets/icons/dot-delivered.svg'
import dotLost from '../assets/icons/dot-lost.svg'
import dotTransit from '../assets/icons/dot-transit.svg'
import openIcon from '../assets/icons/open.svg'
import type { DeliveryStatus } from '../types'

export interface Column<T> {
  header: string
  cell: (row: T) => ReactNode
}

interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[] | undefined
  rowKey: (row: T) => string
  onOpen: (row: T) => void
  emptyMessage?: string
}

export function DataTable<T>({ columns, rows, rowKey, onOpen, emptyMessage = 'Nothing to show yet.' }: DataTableProps<T>) {
  const head = 'h-[39px] bg-table-head px-2.5 text-left text-xs font-medium whitespace-nowrap text-table-head-text uppercase'
  const cell = 'h-[55px] border-b-[0.4px] border-line px-2.5 whitespace-nowrap'

  return (
    <div className="w-full overflow-x-auto px-2 py-5">
      <table className="w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            {columns.map((column, index) => (
              <th key={column.header} scope="col" className={`${head} ${index === 0 ? 'rounded-l-full' : ''}`}>
                {column.header}
              </th>
            ))}
            <th scope="col" className={`${head} w-[76px] rounded-r-full`}>
              <span className="sr-only">Open</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows?.map((row) => (
            <tr key={rowKey(row)} className="hover:bg-white">
              {columns.map((column) => (
                <td key={column.header} className={cell}>
                  {column.cell(row)}
                </td>
              ))}
              <td className={`${cell} text-center`}>
                <button
                  type="button"
                  aria-label="Open"
                  onClick={() => onOpen(row)}
                  className="inline-flex size-8 items-center justify-center rounded-full hover:bg-black/5"
                >
                  <img src={openIcon} alt="" />
                </button>
              </td>
            </tr>
          ))}
          {rows?.length === 0 && (
            <tr>
              <td colSpan={columns.length + 1} className="h-[110px] text-center text-muted">
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

const statuses: Record<DeliveryStatus, { label: string; dot: string }> = {
  pending: { label: 'Pending', dot: dotLost },
  'in-transit': { label: 'In Transit', dot: dotTransit },
  delivered: { label: 'Delivered', dot: dotDelivered },
  cancelled: { label: 'Cancelled', dot: dotLost },
}

export function StatusBadge({ status }: { status: DeliveryStatus }) {
  return (
    <span className="inline-flex items-center gap-2 text-ink">
      <img src={statuses[status].dot} alt="" />
      {statuses[status].label}
    </span>
  )
}
