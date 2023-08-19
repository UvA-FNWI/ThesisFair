import React from 'react'
import MDEditor from '@uiw/react-md-editor'
import rehypeSanitize from 'rehype-sanitize'
import { Card, Button } from 'react-bootstrap'
import { Link } from 'react-router-dom'

import cl from 'clsx'

import api from '../../api'
import graphqlFields from '../../api/graphqlFields'
import Tag from '../tag/tag'

import './entityCard.scss'

class EntityCard extends React.Component {
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
    const entity = this.props.entity || await api.entity.get(this.props.enid).exec()
    const events = this.props.events || await api.event.getAll().exec() || []
    entity.payments ||= []

    this.setState({
      ...entity,
      events,
      eventsByEvid: Object.fromEntries(events.map(event => [event.evid, event])),
      paymentsByDate: Object.fromEntries(entity.payments.map(
        payment => [new Date(payment.eventDate).setHours(0, 0, 0, 0), payment]
      )),
      ...this.props.entity,
    })
  }

  // TODO: this exact same function is also in entityEditor -- reduce duplication
  getStatusLabel(status) {
    switch (status) {
      case 'invoice':
        return 'invoice requested'
      case 'failed':
      case 'open':
        return 'payment processing'
      case 'paid':
        return 'payment completed'
      default:
        return 'payment incomplete'
    }
  }

  render() {
    const contactEmail = this.state.contact && this.state.contact.find(c => c.type === 'email')

    return (
      <Card data-color-mode='light' className={cl('entity-card', { 'entity-card--no-image': !this.state.image })}>
        <Card.Img className='entity-card__image' variant='top' src={this.state.image} />
        <Card.Body className='d-flex flex-column'>
          <Card.Title>{this.state.name}</Card.Title>
          <Card.Subtitle className='entity-card__subtitle'>
            <small className='text-muted'>{contactEmail && contactEmail.content}</small>
          </Card.Subtitle>
          <Card.Text className='entity-card__body'>
            {this.state.isAdmin && (
              <div className='entity-card__tags'>
                <Tag
                  key='type'
                  label={`Type: ${this.state.type || 'unknown'}`}
                  tooltip={`type: ${this.state.type}`}
                  selectable={false}
                />
                {this.state.evids && this.state.evids.map(evid => {
                  const event = this.state.eventsByEvid[evid]
                  const payment = this.state.paymentsByDate[String(new Date(event.start).setHours(0, 0, 0, 0))]
                  return <Tag
                    key={`payment-${evid}`}
                    label={`${event.name}: ${this.getStatusLabel(payment?.status)}`}
                    tooltip={`Payment status: ${payment?.status || 'no attempt made'}`}
                    selectable={false}
                    onClick={() => payment?.url && window.open(payment.url, '_blank').focus()}
                  />
                })}
              </div>
            )}

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

export default EntityCard
