import React from 'react'
import { useParams } from 'react-router-dom'
import { Container } from 'react-bootstrap'
import EntitiesProjects from '../../components/entitiesProjects/entitiesProjects'
import api from '../../api'

class EventProjects extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      event: {},
      entities: [],
      projects: [],
    }
  }

  async componentDidMount() {
    const event = await api.event.get(this.props.params.evid, { entities: true }).exec()
    const entities = await api.entity.getMultiple(event.entities).exec()
    this.setState({ entities })

    const projects = {}
    for (const { enid } of entities) {
      projects[enid] = await api.project.getOfEntity(this.props.params.evid, enid).exec()
    }

    this.setState({ projects })
  }

  setEnabled = async (evid, enabled) => {
    if (this.state.saving) {
      return
    }

    this.setState({ saving: true })
    await api.event.update({ evid, enabled: !enabled }).exec()
    this.setState({ saving: false })
  }

  render() {
    return (
      <Container className='mt-2'>
        <h1>{this.state.event.name}</h1>
        <p>{this.state.event.description}</p>

        <EntitiesProjects entities={this.state.entities} projects={this.state.projects} />
      </Container>
    )
  }
}

function EventProjectsWithParams(props) {
  const params = useParams()

  return <EventProjects {...props} params={params} />
}

export default EventProjectsWithParams
