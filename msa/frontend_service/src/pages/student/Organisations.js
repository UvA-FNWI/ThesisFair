import React from 'react';
import { Container, Button } from 'react-bootstrap';
import { useParams } from 'react-router-dom';
import api from '../../api';
import EntitiesProjects from '../../components/entitiesProjects/entitiesProjects';


class Organisations extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      entities: [],
      projects: {},
    };
    this.entitiesProjects = React.createRef();
  }

  async componentDidMount() {
    const event = await api.event.get(this.props.params.evid, { entities: true }).exec();
    const entities = await api.entity.getMultiple(event.entities).exec();
    this.setState({ entities });

    const projects = {};
    for (const { enid } of entities) {
      projects[enid] = await api.project.getOfEntity(this.props.params.evid, enid).exec();
    }

    this.setState({ projects });
  }

  render() {
    return (
      <Container className='mt-2'>
        <div className='d-flex justify-content-between align-items-baseline mb-4'>
          <h1>Organisations</h1>
          <Button onClick={() => this.entitiesProjects.current.shareAll()}>Give all companies access</Button>
        </div>
        <EntitiesProjects entities={this.state.entities} projects={this.state.projects} shareControls ref={this.entitiesProjects} />
      </Container>
    );
  }
}

function OrganisationsWithParams(props) {
  const params = useParams();

  return <Organisations {...props} params={params} />
};

export default OrganisationsWithParams
