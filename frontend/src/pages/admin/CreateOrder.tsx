import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import arrowLeft from '../../assets/icons/arrow-left.svg'
import packageIcon from '../../assets/icons/package.svg'
import { Navbar } from '../../components/Header'
import { PlaceField } from '../../components/PlaceField'
import { DeliverySummary } from '../../components/TrackingLayout'
import { Button } from '../../components/ui/Button'
import { SelectField, TextAreaField, TextField } from '../../components/ui/Field'
import { useAsync } from '../../hooks/useAsync'
import { api } from '../../services/api'
import type { Delivery, DeliveryType, PlaceInput, Rider } from '../../types'

const deliveryTypes: DeliveryType[] = ['Parcel', 'Cargo']
const categories = ['Electronics', 'Food', 'Fashion', 'Documents', 'Furniture', 'Other']

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong. Please try again.'

function Card({ children }: { children: ReactNode }) {
  return (
    <section className="flex w-full flex-col gap-6 rounded-card border-[0.4px] border-line bg-white px-5 py-[21px]">
      {children}
    </section>
  )
}

function CardTitle({ children }: { children: ReactNode }) {
  return <h2 className="font-display text-[22px] font-semibold text-navy">{children}</h2>
}

function FormError({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="text-sm text-danger">
      {children}
    </p>
  )
}

function OrderForm({ onCreated }: { onCreated: (delivery: Delivery) => void }) {
  const [packageName, setPackageName] = useState('')
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('Parcel')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [from, setFrom] = useState<PlaceInput | null>(null)
  const [to, setTo] = useState<PlaceInput | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!from || !to) {
      setError('Pick the pickup and delivery locations from the suggestions so they can be placed on the map.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      onCreated(await api.createOrder({ packageName, deliveryType, category, description, from, to }))
    } catch (caught) {
      setError(errorMessage(caught))
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-[42px]">
      <div className="flex flex-col gap-6">
        <Card>
          <CardTitle>Enter package details</CardTitle>
          <TextField
            label="Package name (Optional)"
            placeholder="e.g My Oraimo Earpiece Original"
            value={packageName}
            onChange={(event) => setPackageName(event.target.value)}
          />
          <SelectField
            label="Delivery Type"
            options={deliveryTypes}
            required
            value={deliveryType}
            onChange={(event) => setDeliveryType(event.target.value as DeliveryType)}
          />
          <SelectField
            label="Category"
            options={categories}
            placeholder="e.g, Electronics, food"
            required
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          />
          <TextAreaField
            label="Description(Optional)"
            placeholder="Enter a short description of package"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </Card>
        <Card>
          <CardTitle>Enter delivery details</CardTitle>
          <PlaceField label="Pickup Location" placeholder="e.g Jalingo" value={from} onChange={setFrom} />
          <PlaceField
            label="Delivery Location"
            placeholder="e.g Abuja"
            value={to}
            onChange={setTo}
            allowCurrentLocation
          />
        </Card>
      </div>
      <div className="flex flex-col gap-3">
        {error && <FormError>{error}</FormError>}
        <Button type="submit" disabled={submitting} className="w-full">
          Create Delivery Order
          <img src={packageIcon} alt="" />
        </Button>
      </div>
    </form>
  )
}

function RiderOption({ rider, selected, onSelect }: { rider: Rider; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`flex w-full flex-col items-start gap-3 rounded-card bg-white px-5 py-2.5 text-left ${
        selected ? 'border border-brand' : 'border-[0.4px] border-line hover:border-muted'
      }`}
    >
      <span className="flex items-center gap-3">
        <img src={rider.avatarUrl} alt="" className="size-[30px] rounded-full object-cover" />
        <span className="font-num text-[22px] font-semibold">{rider.name}</span>
      </span>
      <span className="font-num text-lg text-muted">Vehicle •{rider.vehicle}</span>
      <span className="font-num text-lg text-muted">Plate Number •{rider.plateNumber}</span>
    </button>
  )
}

function AssignRider({ delivery }: { delivery: Delivery }) {
  const navigate = useNavigate()
  const riders = useAsync(api.getAvailableRiders)
  const [riderId, setRiderId] = useState<string>()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function confirm() {
    if (!riderId) return
    setSubmitting(true)
    setError('')
    try {
      await api.assignRider(delivery.id, riderId)
      navigate(`/admin/track/${delivery.trackingNumber}`)
    } catch (caught) {
      setError(errorMessage(caught))
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-[42px]">
      <Card>
        <DeliverySummary delivery={delivery} />
      </Card>
      <Card>
        <CardTitle>Select a Rider</CardTitle>
        <div role="radiogroup" aria-label="Select a Rider" className="flex flex-col gap-3">
          {riders?.map((rider) => (
            <RiderOption
              key={rider.id}
              rider={rider}
              selected={rider.id === riderId}
              onSelect={() => setRiderId(rider.id)}
            />
          ))}
          {riders?.length === 0 && (
            <p className="text-muted">
              No riders are available right now. A rider needs an assigned vehicle and no trip in progress. The order
              is saved, so you can assign one later.
            </p>
          )}
        </div>
      </Card>
      <div className="flex flex-col gap-3">
        {error && <FormError>{error}</FormError>}
        <Button disabled={!riderId || submitting} onClick={confirm} className="w-full">
          Confirm
        </Button>
      </div>
    </div>
  )
}

export default function CreateOrder() {
  const [delivery, setDelivery] = useState<Delivery>()

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto flex w-[624px] max-w-full flex-col gap-[34px] px-4 pt-[34px] pb-16 sm:px-0">
        <header className="flex flex-col gap-3">
          <h1 className="font-display text-2xl font-semibold text-brand">Delivery details</h1>
          <nav className="flex h-11 items-center gap-2.5 p-2.5 font-num font-medium">
            <Link to="/admin" aria-label="Back to home">
              <img src={arrowLeft} alt="" />
            </Link>
            <p>
              <Link to="/admin" className="text-muted">
                Home /
              </Link>{' '}
              Create a delivery
            </p>
          </nav>
        </header>
        {delivery ? <AssignRider delivery={delivery} /> : <OrderForm onCreated={setDelivery} />}
      </main>
    </div>
  )
}
