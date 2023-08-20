import React from 'react'
import MDEditor from '@uiw/react-md-editor'
import rehypeSanitize from 'rehype-sanitize'
import { Card, Button } from 'react-bootstrap'
import { Link } from 'react-router-dom'

import cl from 'clsx'

import api from '../../api'
import graphqlFields from '../../api/graphqlFields'
import Tag from '../tag/tag'

import './paymentCard.scss'

class PaymentCard extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      ...Object.fromEntries(graphqlFields['Entity'].map(f => [f, null])),
      events: [], // List of all events, for info, needs to be fetched otherwise
      eventsByEvid: {},
      isAdmin: props.isAdmin,
    }
  }

  async componentDidMount() {
    const entity = this.props.entity || (await api.entity.get(this.props.enid).exec())
    const events = this.props.events || (await api.event.getAll().exec()) || []
    entity.payments ||= []

    this.setState({
      ...entity,
      events: events.filter(event => !event.isMarketplace),
      eventsByEvid: Object.fromEntries(events.map(event => [event.evid, event])),
      paymentsByDate: Object.fromEntries(
        entity.payments.map(payment => [new Date(payment.eventDate).setHours(0, 0, 0, 0), payment])
      ),
      ...this.props.entity,
    })
  }

  // TODO: this exact same function is also in entityEditor -- reduce duplication
  getStatusLabel(status) {
    switch (status) {
      case 'invoice':
        return 'Invoice requested'
      case 'failed':
      case 'open':
        return 'Payment processing'
      case 'paid':
        return 'Paid'
      default:
        return 'Awaiting payment'
    }
  }

  render() {
    const event = this.state.eventsByEvid[this.props.evid]
    const payment = this.state.paymentsByDate[String(new Date(event.start).setHours(0, 0, 0, 0))]

    return (
      <Card data-color-mode='light' className={cl('payment-card', { 'payment-card--no-image': !this.state.image })}>
        <Card.Body className='d-flex flex-column payment-card__container'>
          <Card.Title>Outstanding Payment</Card.Title>
          <Card.Subtitle className='payment-card__subtitle'>
            <small className='text-muted'>{this.state.name}</small>
          </Card.Subtitle>
          <Card.Text className='payment-card__body'>
            <div className='payment-card__tags'>
              <Tag
                label={this.getStatusLabel(payment?.status)}
                tooltip={`Payment status: ${payment?.status || 'no attempt made.'}`}
                selectable={false}
                onClick={() => payment?.url && window.open(payment.url, '_blank').focus()}
              />
            </div>

            <MDEditor.Markdown
              source={this.state.description}
              previewOptions={{
                rehypePlugins: [[rehypeSanitize]],
              }}
            />
          </Card.Text>
          {this.state.isAdmin && (
            <div className='mt-auto'>
              <Link to={`/organisation/${this.state.enid}/edit/`}>
                <Button variant='primary'>Edit</Button>
              </Link>{' '}
            </div>
          )}
        </Card.Body>
      </Card>
    )
  }
}

export default PaymentCard
