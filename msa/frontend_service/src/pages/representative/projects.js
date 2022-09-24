import React from 'react';
import { Container, Accordion, Button, Modal, Spinner, Card, OverlayTrigger, Tooltip } from 'react-bootstrap';
import downloadIcon from 'bootstrap-icons/icons/download.svg';
import { useParams } from 'react-router-dom';
import api, { downloadCV } from '../../api';

const genCVName = (student, project) => `${project.name} - ${student.firstname} ${student.lastname}`;

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

    if (cv === false) {
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
              <h4 className='mt-4'>Contact information</h4>
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
              cv === false ?
              <div style={{ width: '100%', minHeight: '95vh' }} className='d-flex justify-content-center align-items-center'>
                <Spinner animation="border" />
              </div>
              :
              <h6>
                This student has not uploaded a CV.
              </h6>
            }
          </div>
        </Modal.Body>
      </Modal>
    )
  }

  downloadAllCVs = async (project) => {
    for (const student of this.state.votedFor[project.pid]) {
      await downloadCV(student.uid, genCVName(student, project));
    }
  }

  render() { // TODO: Change order feature
    return (
      <>
        <Container className='mt-2'>
          <div className='mb-4'>
            <h1>Projects</h1>
          </div>

          {this.state.projects.length === 0 ? <h4>No projects are linked to your company yet</h4> : null}

          <Accordion defaultActiveKey={0}>
            {this.state.projects.map((project, projectIndex) => (
              <Accordion.Item key={projectIndex} eventKey={projectIndex}>
                <Accordion.Header>
                  <div className='d-flex justify-content-between w-100 me-2'>
                    <span>{project.name}</span>
                    <OverlayTrigger overlay={<Tooltip>Download CV's from all students</Tooltip>}>
                      <Button size='sm' variant='outline-primary' onClick={(e) => { e.stopPropagation(); this.downloadAllCVs(project); }}><img src={downloadIcon} alt='download' /></Button>
                    </OverlayTrigger>
                  </div>
                </Accordion.Header>
                <Accordion.Body>
                  <p>{project.description}</p>

                  <h4 className='mt-4'>Students</h4>
                  <div>
                    {this.state.votedFor[project.pid] ? this.state.votedFor[project.pid].map((student, studentIndex) => (
                      <Card key={studentIndex} className='mb-2 hoverable' onClick={(e) => this.setState({ popup: { projectIndex, studentIndex, cv: false } })}>
                        <Card.Body className='d-flex justify-content-between align-items-center'>
                          <p className='m-0'>
                            {student.firstname} {student.lastname}<span className='d-none d-sm-inline ps-2 pe-2'>-</span><span className='d-none d-sm-inline'>{student.studies.join(' | ')}</span>
                          </p>
                          <div>
                            <OverlayTrigger overlay={<Tooltip>Download CV from student</Tooltip>}>
                              <Button size='sm' variant='outline-primary' onClick={(e) => { e.stopPropagation(); downloadCV(student.uid, genCVName(student, project)); }}><img src={downloadIcon} alt='download' /></Button>
                            </OverlayTrigger>
                          </div>
                        </Card.Body>
                      </Card>
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
