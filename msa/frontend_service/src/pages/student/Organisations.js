import React from 'react';
import { Container, Button, Accordion, Modal } from 'react-bootstrap';
import { useParams } from 'react-router-dom';
import api from '../../api';

const httpRegex = /^https?:\/\//

class Organisations extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      sharedEntities: [],
      entities: [],
      projects: {},
      popup: false,
    };
  }

  async componentDidMount() {
    const [user, event] = await Promise.all([
      api.user.get(api.getApiTokenData().uid, { share: true }).exec(),
      api.event.get(this.props.params.evid, { entities: true }).exec(),
    ]);

    const entities = await api.entity.getMultiple(event.entities).exec();
    this.setState({ entities, sharedEntities: user.share });

    const projects = {};
    for (const { enid } of entities) {
      projects[enid] = await api.project.getOfEntity(this.props.params.evid, enid).exec();
    }

    this.setState({ projects });
  }

  renderProjectModal = () => {
    const {enid, entityIndex, projectIndex } = this.state.popup;
    const entity = this.state.entities[entityIndex];
    const project = this.state.projects[enid][projectIndex];

    return (
      <Modal show={true} onHide={() => this.setState({ popup: false })} size='lg'>
        <Modal.Header closeButton>
          Project and company information
        </Modal.Header>
        <Modal.Body>
          <div class='d-flex justify-content-between'>
            <div>
              <h1>{project.name}</h1>
              <h4>About the project</h4>
              {project.description}

              <h4 className='mt-4'>Datanose link</h4>
              <a href={project.datanoseLink} target='_blank' rel='noreferrer'>{project.datanoseLink}</a>
            </div>

            <div>
              <h1>{entity.name}</h1>
              <h4>About the company</h4>
              {entity.description}

              <h4 className='mt-4 mb-0'>Interested in this project?</h4>
              <h6>Please contact them using one of the methods below</h6>
              <ul>
                {entity.contact.map((contact, i) => {
                  let prefix = '';
                  if (contact.type === 'email') {
                    prefix = 'mailto:';
                  } else if (contact.type === 'phonenumber') {
                    prefix = 'tel:';
                  } else if (contact.type === 'website') {
                    if (!httpRegex.test(contact.content)) {
                      prefix = 'https://';
                    }
                  } else {
                    console.error('unkown contact type', contact.type);
                    return null;
                  }

                  return (<li key={i}><a href={prefix + contact.content} target='_blank' rel='noreferrer'>{contact.content}</a></li>);
                })}
              </ul>
            </div>
          </div>
        </Modal.Body>
      </Modal>
    )
  }

  setShare = async (enid, state) => {
    await api.user.student.shareInfo(api.getApiTokenData().uid, enid, state).exec();

    const sharedEntities = [...this.state.sharedEntities];
    if (state) {
      sharedEntities.push(enid);
    } else {
      sharedEntities.splice(sharedEntities.indexOf(enid), 1);
    }
    this.setState({ sharedEntities });
  }

  shareAll = async () => {
    for (const { enid } of this.state.entities) {
      await this.setShare(enid, true);
    }
  }

  render() {
    return (
      <Container className='mt-2'>
        <div className='d-flex justify-content-between align-items-baseline mb-4'>
          <h1>Organisations</h1>
          <Button onClick={this.shareAll}>Give all companies access</Button>
        </div>
        <Accordion>
          {this.state.entities.map((entity, entityIndex) => {
            const shared = this.state.sharedEntities.includes(entity.enid);
            return (
            <Accordion.Item key={entityIndex} eventKey={entityIndex}>
              <Accordion.Header>
                {entity.name}

                <div className='flex-grow-1 d-flex justify-content-end me-4'>
                  <Button variant={shared ? 'outline-primary' : 'primary'} size='sm' onClick={(e) => {e.stopPropagation(); this.setShare(entity.enid, !shared)}}>{shared ? 'Unshare information' : 'Share information'}</Button>
                </div>
              </Accordion.Header>
              <Accordion.Body>

                <Accordion>
                  {this.state.projects[entity.enid] ? this.state.projects[entity.enid].map((project, projectIndex) => (
                    <Accordion.Item key={projectIndex} eventKey={projectIndex}>
                      <Accordion.Header>
                        {project.name}
                      </Accordion.Header>
                      <Accordion.Body>
                        <p>{project.description}</p>

                        <Button onClick={() => this.setState({ popup: { enid: entity.enid, entityIndex, projectIndex } })}>More info</Button>
                      </Accordion.Body>
                    </Accordion.Item>
                  )) : null}
                </Accordion>

              </Accordion.Body>
            </Accordion.Item>
          )})}
        </Accordion>

        { this.state.popup ?
          this.renderProjectModal()
        : null }
      </Container>
    );
  }
}

function OrganisationsWithParams(props) {
  const params = useParams();

  return <Organisations {...props} params={params} />
};

export default OrganisationsWithParams
