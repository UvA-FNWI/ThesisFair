import React from 'react';
import { Container, Accordion, Button, Card, OverlayTrigger, Tooltip, Form } from 'react-bootstrap';
import downloadIcon from 'bootstrap-icons/icons/download.svg';
import { useParams } from 'react-router-dom';
import api, { downloadCV } from '../../api';
import StudentPopup from '../../components/studentPopup/studentPopup';

const genCVName = (student, project) => `${project.name} - ${student.firstname} ${student.lastname}`;

class ProjectListing extends React.Component {
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

    projects.push({ pid: 'manuallyShared', name: 'Students that shared their data but did not vote for a project', description: 'Thesis students explicitly shared their data with your company but have not voted for any of your projects.' });
    votedFor['manuallyShared'] = await api.user.student.getWhoManuallyShared(api.getApiTokenData().enid).exec();
    this.setState({ projects, votedFor });
  }

  renderStudentModal = () => {
    const { projectIndex, studentIndex } = this.state.popup;
    const project = this.state.projects[projectIndex];
    const student = this.state.votedFor[project.pid][studentIndex];

    return <StudentPopup student={student} onHide={() => this.setState({ popup: false })} />
  }

  downloadAllCVs = async (project) => {
    for (const student of this.state.votedFor[project.pid]) {
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
            {this.state.projects.map((project, projectIndex) => (
              <Accordion.Item key={projectIndex} eventKey={projectIndex}>
                <Accordion.Header>
                  <div className='d-flex justify-content-between w-100 me-2'>
                    <span>{project.name}</span>
                    <ProjectEditorTrigger params={{...project, edit: this.props.params.edit}}/>
                    <OverlayTrigger overlay={<Tooltip>Download CV's from all students</Tooltip>}>
                      <Button size='sm' variant='outline-primary' onClick={(e) => { e.stopPropagation(); this.downloadAllCVs(project); }}><img src={downloadIcon} alt='download' /></Button>
                    </OverlayTrigger>
                  </div>
                </Accordion.Header>
                <Accordion.Body>
                  <div dangerouslySetInnerHTML={{ __html: project.description }} />

                  <h4 className='mt-4'>Students</h4>
                  <div>
                    {this.state.votedFor[project.pid] ? this.state.votedFor[project.pid].length > 0 ? this.state.votedFor[project.pid].map((student, studentIndex) => {
                      const studentInfoPresent = student.firstname || student.lastname || student.studies.length > 0;
                      return (
                        <Card key={studentIndex} className='mb-2 hoverable' bg={studentInfoPresent ? 'white' : 'gray'} onClick={studentInfoPresent ? (e) => this.setState({ popup: { projectIndex, studentIndex, cv: false } }) : null}>
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

class ProjectEditor extends React.Component {
  // TODO: have a controlled input rather than uncontrolled (i.e. update state
  // as form is edited)
  constructor(props) {
    super(props);

    this.state = {
      evid: this.props.params.evid,
      name: "",
      description: "",
    };

    this.submit = this.submit.bind(this)
  }

  async componentDidMount() {
    if (this.props.params.pid) {
      const project = await api.project.get(this.props.params.pid).exec();
      this.setState({
        name: project.name,
        description: project.description,
      });
    }
  }

  async submit(e) {
    // Make sure the page does not reload
    e.preventDefault();

    const formData = Object.fromEntries(new FormData(e.target).entries());

    // TODO: handle errors and show to user
    if (this.props.params.pid) {
      await api.project.update({
        enid: api.getApiTokenData().enid,
        pid: this.props.params.pid,
        name: formData.name,
        description: formData.description,
      }).exec();
    } else {
      await api.project.create({
        enid: api.getApiTokenData().enid,
        evid: this.props.params.evid,
        name: formData.name,
        description: formData.description,
      }).exec();
    }

    this.props.params.close();
  }

  cancel(e) {
    e.preventDefault()
    this.props.params.close();
  }

  render() {
    return <Form onSubmit={this.submit}>
      <Form.Group className="mb-3" controlId="name">
        <Form.Label>Project Name</Form.Label>
        <Form.Control
          name="name"
          type="text"
          placeholder="Enter a concise title for your project"
          defaultValue={this.state.name}
        />
      </Form.Group>

      <Form.Group className="mb-3" controlId="description">
        <Form.Label>Project description</Form.Label>
        <Form.Control
          name="description"
          as="textarea"
          rows={8}
          placeholder="Your project's full description"
          defaultValue={this.state.description}
        />
      </Form.Group>

      <Button variant="primary" type="submit">
        Submit
      </Button>

      <Button variant="secondary" type="cancel">
        Cancel
      </Button>

      <Button variant="secondary" type="cancel">
        Delete project
      </Button>
    </Form>;
  }
}

class ProjectEditorTrigger extends React.Component {
  constructor(props) {
    super(props);

    this.buttonText = this.buttonText.bind(this)
    this.onClick = this.onClick.bind(this)
  }

  buttonText() {
    if (this.props.params.pid) {
      return "Edit";
    } else {
      return "Create new project";
    }
  }

  onClick(e) {
    e.stopPropagation()
    this.props.params.edit(this.props.params.pid)
  }

  render() {
    if (this.props.params.pid != 'manuallyShared') {
      return <Button size='sm' variant='outline-primary' onClick={this.onClick}>{this.buttonText()}</Button>;
    }
  }
}

class Projects extends React.Component {
  constructor(props) {
    super(props);
    
    this.state = {
      editor: null,
    }

    this.edit = this.edit.bind(this);
    this.close = this.close.bind(this);
  }

  edit(pid) {
    this.setState({
      editor: <ProjectEditor params={{pid: pid, ...this.props.params, submit: this.close}}/>
    });
  }

  close() {
    this.setState({
      editor: null,
    });
  }

  render() {
    switch (this.state.editor) {
      case null: 
        return (
          <div>
            <ProjectListing params={{...this.props.params, edit: this.edit}}/>
            <ProjectEditorTrigger params={{pid: null, edit: this.edit}}/>
          </div>
        );
      default:
        return (
          <div>
            {this.state.editor}
          </div>
        );
      }
  }
}


function ProjectsWithParams(props) {
  const params = useParams();

  return <Projects {...props} params={params} />
};

export default ProjectsWithParams
