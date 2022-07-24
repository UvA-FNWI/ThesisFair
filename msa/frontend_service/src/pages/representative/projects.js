import React from 'react';
import { Container } from 'react-bootstrap';
import { useParams } from 'react-router-dom';
import api from '../../api';


class Projects extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      projects: [],
    };
  }

  async componentDidMount() {
    const projects = await api.project.getOfEntity(this.props.params.evid, api.getApiTokenData().enid).exec();
    console.log(projects);
  }

  render() {
    return (
      <Container className='mt-2'>
        <h1>Organisations You Voted For</h1>
      </Container>
    );
  }
}

function ProjectsWithParams(props) {
  const params = useParams();

  return <Projects {...props} params={params} />
};

export default ProjectsWithParams
