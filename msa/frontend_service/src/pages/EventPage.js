import React from 'react'

import EventView from '../components/eventView/eventView'
import { useParams } from 'react-router-dom'
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
    return <>
      <EventView evid={this.props.params.evid}/>
    </>
  }
}

function EventPageWithParams(props) {
  const params = useParams()

  return <EventPage {...props} params={params} />
}

export default EventPageWithParams
