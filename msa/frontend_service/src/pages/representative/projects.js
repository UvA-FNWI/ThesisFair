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
      events: {}, // Map from EVID to event info
      eventProjects: {}, // Map from EVID to list of PIDs
      popup: false,
    };
  }

  async componentDidMount() { // Optimisation: Store student only once in state
    var projects = await api.project.getOfEntity(null, api.getApiTokenData().enid).exec();
    projects = Object.fromEntries(projects.map(project => [project.pid, project]))

    // Get the votes of this entity as a list of [pid, uid] pairs
    var votes = await api.votes.getOfEntity(api.getApiTokenData().enid, null).exec()
    // Reduce the uids into lists, indexed by these pids ({pid: [uid, uid, ...], ...})
    votes = votes.reduce((c, vote) => ({...c, [vote.pid]: [...(c[vote.pid] || []), vote.uid]}), {})
    // Call 'getMultiple(uids)' for user info on these lists
    for (const [pid, uids] of Object.entries(votes)) {
      votes[pid] = await api.user.getMultiple(uids).exec()
    }

    var events = await api.event.getOfEntity(api.getApiTokenData().enid).exec();
    events = Object.fromEntries(events.map(event => [event.evid, event]))

    var eventProjects = Object.keys(events).map(
      evid => [evid, Object.keys(projects).filter(pid => projects[pid].evids.includes(evid))]
    )
    eventProjects = Object.fromEntries(eventProjects)

    projects['manuallyShared'] = {
      pid: 'manuallyShared',
      name: 'Students that shared their data but did not vote for a project',
      description: 'Thesis students explicitly shared their data with your company but have not voted for any of your projects.'
    };
    votes['manuallyShared'] = await api.user.student.getWhoManuallyShared(api.getApiTokenData().enid).exec();

    this.setState({projects, votes, events, eventProjects});
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

  renderProjectListing(projects) {
    console.log(projects)
    if (projects.length <= 0) {
      return (<p>No projects for this event</p>)
    }

    return (
      <Accordion defaultActiveKey={0}>
        {Object.entries(projects).map(([pid, project]) => (
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
    )
  }

  render() {
    return (
      <>
        <Container className='mt-2'>
          <div className='mb-4'>
            <h1>Projects</h1>
          </div>

          {this.state.projects.length === 0 ? <h4>No projects are linked to your company yet</h4> : null}

          {Object.entries(this.state.eventProjects).map(
            ([evid, pids]) => {
              const projects = pids.map(pid => this.state.projects[pid])
              const event = this.state.events[evid]

              console.log(new Date(event.start))
              return (
                <>
                <br/>
                <span className='d-flex justify-content-between'>
                  <h3 style={{'align-self': 'flex-end'}}>{event.name}</h3>
                  <time style={{'align-self': 'flex-end'}} datetime={event.start}>
                    {(new Date(event.start)).toLocaleDateString()}
                  </time>
                </span>
                <hr style={{'margin-top': 0, 'margin-bottom': '1.25em'}}/>
                {this.renderProjectListing(projects)}
                </>
              )
            }
          )}
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
