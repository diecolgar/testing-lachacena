import type { OrderStatus, DisputeStatus, ListingStatus } from '@/lib/types'

const ORDER_STATUS: Record<OrderStatus, { label: string; className: string }> = {
  pending:   { label: 'Pending',    className: 'bg-yellow-100 text-yellow-800' },
  paid:      { label: 'Paid',       className: 'bg-blue-100 text-blue-800' },
  shipped:   { label: 'Shipped',    className: 'bg-indigo-100 text-indigo-800' },
  delivered: { label: 'Delivered',  className: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelled',  className: 'bg-gray-100 text-gray-600' },
  disputed:  { label: 'Disputed',   className: 'bg-red-100 text-red-800' },
  refunded:  { label: 'Refunded',   className: 'bg-purple-100 text-purple-800' },
}

const DISPUTE_STATUS: Record<DisputeStatus, { label: string; className: string }> = {
  open:             { label: 'Open',            className: 'bg-red-100 text-red-800' },
  under_review:     { label: 'Under Review',    className: 'bg-yellow-100 text-yellow-800' },
  resolved_buyer:   { label: 'Resolved (Buyer)',  className: 'bg-green-100 text-green-800' },
  resolved_seller:  { label: 'Resolved (Seller)', className: 'bg-green-100 text-green-800' },
  closed:           { label: 'Closed',          className: 'bg-gray-100 text-gray-600' },
}

const LISTING_STATUS: Record<ListingStatus, { label: string; className: string }> = {
  active:  { label: 'Active',  className: 'bg-green-100 text-green-800' },
  sold:    { label: 'Sold',    className: 'bg-gray-100 text-gray-600' },
  paused:  { label: 'Paused',  className: 'bg-yellow-100 text-yellow-800' },
  removed: { label: 'Removed', className: 'bg-red-100 text-red-800' },
}

interface Props {
  type: 'order' | 'dispute' | 'listing'
  status: string
}

export default function StatusBadge({ type, status }: Props) {
  let config = { label: status, className: 'bg-gray-100 text-gray-600' }

  if (type === 'order') config = ORDER_STATUS[status as OrderStatus] ?? config
  if (type === 'dispute') config = DISPUTE_STATUS[status as DisputeStatus] ?? config
  if (type === 'listing') config = LISTING_STATUS[status as ListingStatus] ?? config

  return (
    <span className={`badge ${config.className}`}>{config.label}</span>
  )
}
