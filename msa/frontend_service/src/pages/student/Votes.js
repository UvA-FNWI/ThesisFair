import React from 'react'
import { Container } from 'react-bootstrap'
import { useParams } from 'react-router-dom'
import api from '../../api'
import EntitiesProjects from '../../components/entitiesProjects/entitiesProjects'

class Votes extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      entities: [],
      projects: {},
    }
  }

  async componentDidMount() {
    const votes = await api.votes.getOfStudent(api.getApiTokenData().uid, this.props.params.evid).exec()

    const projects = await api.project.getMultiple(votes).exec()
    const entities = await api.entity.getMultiple(projects.map(project => project.enid)).exec()

    const projectsDict = {}
    for (const project of projects) {
      if (!projectsDict[project.enid]) {
        projectsDict[project.enid] = []
      }

      projectsDict[project.enid].push(project)
    }

    this.setState({ entities, projects: projectsDict })
  }

  render() {
    return (
      <Container className='mt-2'>
        <div className='mb-4'>
          <h1>Organisations You Voted For</h1>
        </div>
        <EntitiesProjects entities={this.state.entities} projects={this.state.projects} ref={this.entitiesProjects} />
      </Container>
    )
  }
}

function VotesWithParams(props) {
  const params = useParams()

  return <Votes {...props} params={params} />
}

export default VotesWithParams
