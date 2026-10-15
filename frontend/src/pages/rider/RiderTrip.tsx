import { useReducer, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import checkLg from '../../assets/icons/check-lg.svg'
import { NotFound } from '../../components/NotFound'
import { NoticeCard, NotificationsSection } from '../../components/Notices'
import { DeliverySummary, PanelCard, PanelSection, TrackingLayout } from '../../components/TrackingLayout'
import { Button } from '../../components/ui/Button'
import { SelectField, TextAreaField } from '../../components/ui/Field'
import { Modal, ModalMessage } from '../../components/ui/Modal'
import { useAsync } from '../../hooks/useAsync'
import { mapPropsOf } from '../../lib/deliveryMap'
import { api } from '../../services/api'
import type { Notice } from '../../types'
import { useRider } from './useRider'

const complaints = ['Traffic', 'Accident', 'Vehicle fault', 'Bad weather', 'Other']

const deviationAlert: Notice = {
  id: 'route-deviation',
  kind: 'warning',
  title: 'Route Deviation Alert',
  time: 'now',
  body: 'You’re moving away from the planned delivery route. Please return to the suggested route or contact admin if there’s an issue',
}

function Communications({ deliveryId }: { deliveryId: string }) {
  const [complaint, setComplaint] = useState(complaints[0])
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('')

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    try {
      await api.sendComplaint(deliveryId, complaint, description)
      setDescription('')
      setStatus('Sent to admin.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not send. Please try again.')
    }
  }

  return (
    <PanelCard className="py-[17px]">
      <form onSubmit={onSubmit} className="flex flex-col gap-6">
        <SelectField
          label="Complaint"
          options={complaints}
          value={complaint}
          onChange={(event) => setComplaint(event.target.value)}
        />
        <TextAreaField
          label="Description"
          placeholder="Enter a short description of reason for delay"
          required
          value={description}
          onChange={(event) => {
            setDescription(event.target.value)
            setStatus('')
          }}
        />
        {/* Not in the Figma frame: the design has no way to submit this form. */}
        <div className="flex items-center justify-between gap-4">
          <p role="status" className="text-sm text-muted">
            {status}
          </p>
          <Button type="submit" variant="navy" size="sm">
            Send to admin
          </Button>
        </div>
      </form>
    </PanelCard>
  )
}

export default function RiderTrip() {
  const navigate = useNavigate()
  const { trackingNumber = '' } = useParams()
  const { activeTrip, live } = useRider()
  const [version, reload] = useReducer((count: number) => count + 1, 0)
  const delivery = useAsync(() => api.getDelivery(trackingNumber), [trackingNumber, version])
  const [dialog, setDialog] = useState<'not-reached' | 'complete' | null>(null)
  const [error, setError] = useState('')

  if (delivery === undefined) return null
  if (delivery === null) return <NotFound homePath="/rider" message={`No delivery found for ${trackingNumber}.`} />

  // Live position and route state only apply while this is the trip being driven
  const isActive = activeTrip?.id === delivery.id
  const offRoute = isActive ? live.offRoute : delivery.routeState === 'off-route'
  const underway = delivery.status === 'in-transit'
  const deliveryId = delivery.id

  async function run(action: () => Promise<void>) {
    setError('')
    try {
      await action()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something went wrong. Please try again.')
    }
  }

  const markPickup = () =>
    run(async () => {
      await api.markPickup(deliveryId)
      reload()
    })

  const markDelivery = () =>
    run(async () => {
      const result = await api.markDelivered(deliveryId)
      setDialog(result.ok ? 'complete' : 'not-reached')
    })

  const finish = () => navigate('/rider')

  return (
    <>
      <TrackingLayout
        title="Delivery Trip"
        trackingNumber={delivery.trackingNumber}
        homePath="/rider"
        map={{
          ...mapPropsOf(delivery),
          position: (isActive && live.position) || delivery.lastPosition,
          offRoute,
        }}
        toast={offRoute && <NoticeCard toast notice={deviationAlert} />}
      >
        <DeliverySummary delivery={delivery} showTrackingNumber={false} />
        {underway ? (
          <>
            <PanelSection title="Communications">
              <Communications deliveryId={delivery.id} />
            </PanelSection>
            <PanelSection title="Milestone">
              <PanelCard className="flex flex-col gap-3 py-[17px]">
                {delivery.pickedUp ? (
                  <Button className="w-full" onClick={markDelivery}>
                    Mark Delivery
                  </Button>
                ) : (
                  <Button variant="outline" className="w-full" onClick={markPickup}>
                    Mark Pickup
                  </Button>
                )}
                {error && (
                  <p role="alert" className="text-sm text-danger">
                    {error}
                  </p>
                )}
              </PanelCard>
            </PanelSection>
          </>
        ) : (
          <p className="text-lg text-muted">
            {delivery.status === 'pending'
              ? 'This trip hasn’t started yet. Start it from Pending Deliveries.'
              : `This delivery is ${delivery.status}.`}
          </p>
        )}
        <NotificationsSection notices={offRoute ? [deviationAlert] : []} />
      </TrackingLayout>

      {dialog === 'not-reached' && (
        <Modal
          title="Destination Not Reached"
          onClose={() => setDialog(null)}
          footer={
            <Button variant="neutral" size="auto" onClick={() => setDialog(null)}>
              Close
            </Button>
          }
        >
          <ModalMessage>
            You can’t complete this delivery yet because you haven’t reached the expected destination. Continue to the
            delivery location or contact admin for assistance.
          </ModalMessage>
        </Modal>
      )}
      {dialog === 'complete' && (
        <Modal
          title="Delivery Complete"
          onClose={finish}
          footer={
            <Button variant="neutral" size="auto" onClick={finish}>
              Finish
            </Button>
          }
        >
          <div className="flex flex-col items-center gap-5 pt-5">
            <span className="flex size-[60px] items-center justify-center rounded-full bg-success-soft">
              <img src={checkLg} alt="" />
            </span>
            <ModalMessage>
              Delivery completed successfully. The package has reached its destination and the trip is now closed.
            </ModalMessage>
          </div>
        </Modal>
      )}
    </>
  )
}
