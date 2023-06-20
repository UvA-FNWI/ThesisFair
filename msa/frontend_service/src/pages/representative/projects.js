import React from 'react';
import { Container, Accordion, Button, Card, OverlayTrigger, Tooltip } from 'react-bootstrap';
import downloadIcon from 'bootstrap-icons/icons/download.svg';
import { useParams } from 'react-router-dom';
import api, { downloadCV } from '../../api';
import StudentPopup from '../../components/studentPopup/studentPopup';

const genCVName = (student, project) => `${project.name} - ${student.firstname} ${student.lastname}`;

class Projects extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      projects: {}, // Map from PID to project
      votes: {}, // Map from PID to users that voted for it
      popup: false,
    };
  }

  async componentDidMount() { // Optimisation: Store student only once in state
    var projects = await api.project.getOfEntity(null, api.getApiTokenData().enid).exec();
    projects = Object.fromEntries(projects.map(project => [project.pid, project]))

    var votes = {}
    for (const pid in projects) {
      // TODO: test and remove params.evid
      const uids = await api.votes.getOfProject(pid, this.props.params.evid).exec();
      votes[pid] = await api.user.getMultiple(uids).exec();
    }

    projects['manuallyShared'] = {
      pid: 'manuallyShared',
      name: 'Students that shared their data but did not vote for a project',
      description: 'Thesis students explicitly shared their data with your company but have not voted for any of your projects.'
    };
    votes['manuallyShared'] = await api.user.student.getWhoManuallyShared(api.getApiTokenData().enid).exec();

    this.setState({projects, votes});
  }

  renderStudentModal = () => {
    const { projectIndex, studentIndex } = this.state.popup;
    const project = this.state.projects[projectIndex];
    const student = this.state.votes[project.pid][studentIndex];

    return <StudentPopup student={student} onHide={() => this.setState({ popup: false })} />
  }

  downloadAllCVs = async (project) => {
    for (const student of this.state.votes[project.pid]) {
      await downloadCV(student.uid, genCVName(student, project));
    }
  }

  render() {
    return (
      <>
        <Container className='mt-2'>
          <div className='mb-4'>
            <h1>Projects</h1>
          </div>

          {this.state.projects.length === 0 ? <h4>No projects are linked to your company yet</h4> : null}

          <Accordion defaultActiveKey={0}>
            {Object.entries(this.state.projects).map(([pid, project]) => (
              <Accordion.Item key={pid} eventKey={pid}>
                <Accordion.Header>
                  <div className='d-flex justify-content-between w-100 me-2'>
                    <span>{project.name}</span>
                    <OverlayTrigger overlay={<Tooltip>Download CV's from all students</Tooltip>}>
                      <Button size='sm' variant='outline-primary' onClick={(e) => { e.stopPropagation(); this.downloadAllCVs(project); }}><img src={downloadIcon} alt='download' /></Button>
                    </OverlayTrigger>
                  </div>
                </Accordion.Header>
                <Accordion.Body>
                  <div dangerouslySetInnerHTML={{ __html: project.description }} />

                  <h4 className='mt-4'>Students</h4>
                  <div>
                    {this.state.votes[project.pid] ? this.state.votes[project.pid].length > 0 ? this.state.votes[project.pid].map((student, studentIndex) => {
                      const studentInfoPresent = student.firstname || student.lastname || student.studies.length > 0;
                      return (
                        <Card key={studentIndex} className='mb-2 hoverable' bg={studentInfoPresent ? 'white' : 'gray'} onClick={studentInfoPresent ? (e) => this.setState({ popup: { pid, studentIndex, cv: false } }) : null}>
                          <Card.Body className='d-flex justify-content-between align-items-center'>
                            { studentInfoPresent ?
                              <>
                                <p className='m-0'>
                                  {student.firstname} {student.lastname}<span className='d-none d-sm-inline ps-2 pe-2'>-</span><span className='d-none d-sm-inline'>{student.studies.join(' | ')}</span>
                                </p>
                                <div>
                                  <OverlayTrigger overlay={<Tooltip>Download CV from student</Tooltip>}>
                                    <Button size='sm' variant='outline-primary' onClick={(e) => { e.stopPropagation(); downloadCV(student.uid, genCVName(student, project)); }}><img src={downloadIcon} alt='download' /></Button>
                                  </OverlayTrigger>
                                </div>
                              </>
                              :
                              <p className='m-0'>
                                Student has not logged in yet
                              </p>
                            }
                          </Card.Body>
                        </Card>
                      )
                    })
                      : <h6><em>No students have voted for this project.</em></h6>
                      : null}
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
