import React from 'react'

import EventView from '../components/eventView/eventView'
import { useParams } from 'react-router-dom'

class EventPage extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      evid: props.params.evid,
    }
  }

  render() {
    return <EventView evid={this.state.evid}/>
  }
}

function EventPageWithParams(props) {
  const params = useParams()

  return <EventPage {...props} params={params} />
}

export default EventPageWithParams
