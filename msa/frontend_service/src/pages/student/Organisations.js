import React from 'react'
import { Container } from 'react-bootstrap'
import { useParams } from 'react-router-dom'
import api from '../../api'
import EntitiesProjects from '../../components/entitiesProjects/entitiesProjects'

class Organisations extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      entities: [],
      projects: {},
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

  render() {
    return (
      <Container className='mt-2'>
        <div className='mb-4'>
          <h1>Organisations</h1>
        </div>
        <EntitiesProjects entities={this.state.entities} projects={this.state.projects} shareControls />
      </Container>
    )
  }
}

function OrganisationsWithParams(props) {
  const params = useParams()

  return <Organisations {...props} params={params} />
}

export default OrganisationsWithParams
