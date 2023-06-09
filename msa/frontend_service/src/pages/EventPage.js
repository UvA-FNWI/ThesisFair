import React from 'react'
import { useParams } from 'react-router-dom'
import { Container, Spinner } from 'react-bootstrap'
import api from '../api'

class EventPage extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      event: {},
      eventImage: false,
    }
  }

  async componentDidMount() {
    const event = api.event.get(this.props.params.evid).exec()
    const eventImage = api.event
      .getImage(this.props.params.evid, api.getApiTokenData().type === 's' ? 'student' : 'rep')
      .exec()

    this.setState({ event: await event })
    this.setState({ eventImage: await eventImage })
  }

  render() {
    return (
      <Container className='mt-2'>
        <h2>{this.state.event.name}</h2>
        <div dangerouslySetInnerHTML={{ __html: this.state.event.description }} />

        {this.state.eventImage ? (
          <img width='100%' src={this.state.eventImage} alt='Map of the event' />
        ) : this.state.eventImage === false ? (
          <div
            style={{ width: '100%', minHeight: '95vh' }}
            className='d-flex justify-content-center align-items-center'
          >
            <Spinner animation='border' />
          </div>
        ) : null}
      </Container>
    )
  }
}

function EventPageWithParams(props) {
  const params = useParams()

  return <EventPage {...props} params={params} />
}

export default EventPageWithParams
