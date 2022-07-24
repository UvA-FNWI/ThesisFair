import React from 'react';
import { Container, Accordion, Button, Modal, Spinner } from 'react-bootstrap';
import { useParams } from 'react-router-dom';
import api from '../../api';


class Projects extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      projects: [],
      votedFor: {},
      popup: false,
    };
  }

  async componentDidMount() { // Optimisation: Store student only once in state
    const projects = await api.project.getOfEntity(this.props.params.evid, api.getApiTokenData().enid).exec();
    this.setState({ projects });

    const votedFor = {};
    for (const project of projects) {
      const uids = await api.votes.getOfProject(project.pid, this.props.params.evid).exec();
      votedFor[project.pid] = await api.user.getMultiple(uids).exec();
    }
    this.setState({ votedFor });
  }

  renderStudentModal = () => {
    const { projectIndex, studentIndex, cv } = this.state.popup;
    const project = this.state.projects[projectIndex];
    const student = this.state.votedFor[project.pid][studentIndex];

    if (!cv) {
      api.user.student.getCV(student.uid).exec().then((cv) => {
        this.setState({ popup: { projectIndex, studentIndex, cv } });
      })
    }

    return (
      <Modal show={true} onHide={() => this.setState({ popup: false })} size='xl'>
        <Modal.Header closeButton>
          Student information
        </Modal.Header>
        <Modal.Body>
          <h1>{student.firstname} {student.lastname}</h1>

          <div className='row'>
            <div className='col-12 col-sm-6 col-lg-4'>
              <h4 className='mt-4'>Contact info</h4>
              <span className='d-block'>Email: {student.email || 'Not given'}</span>
              <span className='d-block'>Phone number: {student.phone || 'Not given'}</span>
            </div>

            <div className='col-12 col-sm-6 col-lg-4'>
              <h4 className='mt-4'>Links</h4>
              <ul>
                {student.websites.map((website, i) => <li key={i}><a href={website} target='_blank' rel='noreferrer'>{website}</a></li>)}
              </ul>
            </div>
            <div className='col-12 col-sm-6 col-lg-4'>
              <h4 className='mt-4'>Studies</h4>
              <ul>
                {student.studies.map((study, i) => <li key={i}>{study}</li>)}
              </ul>
            </div>
          </div>


          <div className='mt-4'>
            <h4>CV</h4>
            {cv ?
              <embed style={{ width: '100%', minHeight: '95vh' }} src={cv} />
            :
              <div style={{ width: '100%', minHeight: '95vh' }} className='d-flex justify-content-center align-items-center'>
                <Spinner animation="border" />
              </div>
            }
          </div>
        </Modal.Body>
      </Modal>
    )
  }

  render() {
    return (
      <>
        <Container className='mt-2'>
          <h1>Projects</h1>
          <Accordion>
            {this.state.projects.map((project, projectIndex) => (
              <Accordion.Item key={projectIndex} eventKey={projectIndex}>
                <Accordion.Header>
                  {project.name}
                </Accordion.Header>
                <Accordion.Body>
                  <p>{project.description}</p>

                  <h4 className='mt-4'>Students</h4>
                  <div className='d-flex'>
                    {this.state.votedFor[project.pid] ? this.state.votedFor[project.pid].map((student, studentIndex) => (
                      <Button key={studentIndex} className='flex-grow-1' onClick={(e) => this.setState({ popup: { projectIndex, studentIndex } })}> {/* TODO: Make a clickable card from this. */}
                        {student.firstname} {student.lastname}<span className='d-none d-md-inline ps-2 pe-2'>-</span><span className='d-none d-md-inline'>{student.studies.join(' | ')}</span>
                      </Button>
                    )) : null}
                  </div>
                </Accordion.Body>
              </Accordion.Item>
            ))}
          </Accordion>
        </Container>

        {this.state.popup ?
          this.renderStudentModal()
          : null}
      </>
    );
  }
}

function ProjectsWithParams(props) {
  const params = useParams();

  return <Projects {...props} params={params} />
};

export default ProjectsWithParams
