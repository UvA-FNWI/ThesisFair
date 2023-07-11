import React from 'react'

import EventCard from '../../components/eventCard/eventCard'
import { useParams, Link } from 'react-router-dom'
import { Row, Col, Button } from 'react-bootstrap'
import api from '../../api'

import '../../styles/events.scss'

class EventsPage extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      activeEvents: [],
      inactiveEvents: [],
    }
  }

  async componentDidMount() {
    const events = await api.event.getAll().exec()

    this.setState({
      activeEvents: events.filter(event => event.enabled),
      inactiveEvents: api.getApiTokenData().type === 'a' ? events.filter(event => !event.enabled) : [],
    })
  }

  render() {
    return (
      <>
        <h1 className='events-page__header'>Active events</h1>
        <hr />
        {api.getApiTokenData().type === 'a' &&
        <Link to='event/create/'>
          <Button variant='outline-primary'>Create new event</Button>
        </Link>}
        {this.state.activeEvents.length > 0 ? (
          <Row className='g-4 events-page__row'>
            {this.state.activeEvents.map(event => (
              <Col md='auto'>
                <EventCard evid={event.evid} />
              </Col>
            ))}
          </Row>
        ) : (
          <p>No events currently active</p>
        )}
        {this.state.inactiveEvents.length > 0 && api.getApiTokenData().type !== 's' && (
          <>
            <h1 className='events-page__header'>Past events</h1>
            <hr />
            <Row className='g-4 events-page__row'>
              {this.state.inactiveEvents.map(event => (
                <Col md='auto'>
                  <EventCard evid={event.evid} />
                </Col>
              ))}
            </Row>
          </>
        )}
      </>
    )
  }
}

function EventsPageWithParams(props) {
  const params = useParams()

  return <EventsPage {...props} params={params} />
}

export default EventsPageWithParams
