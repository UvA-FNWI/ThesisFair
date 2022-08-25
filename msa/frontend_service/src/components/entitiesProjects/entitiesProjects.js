import React from 'react';
import { Button, Accordion, Modal, Form } from 'react-bootstrap';
import api from '../../api';

const httpRegex = /^https?:\/\//

class EntitiesProjects extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      sharedEntities: [],
      popup: false,
    };
  }

  async componentDidMount() {
    const user = await api.user.get(api.getApiTokenData().uid, { share: true }).exec();
    this.setState({ sharedEntities: user.share });
  }

  renderProjectModal = () => {
    const { enid, entityIndex, projectIndex } = this.state.popup;
    const entity = this.props.entities[entityIndex];
    const project = this.props.projects[enid][projectIndex];

    return (
      <Modal show={true} onHide={() => this.setState({ popup: false })} size='lg'>
        <Modal.Header closeButton>
          Project and organisation information
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
              <h4>About the organisation</h4>
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
    for (const { enid } of this.props.entities) {
      await this.setShare(enid, true);
    }
  }

  render() {
    return (
      <>
        <Accordion>
          {this.props.entities.map((entity, entityIndex) => {
            const shared = this.state.sharedEntities.includes(entity.enid);
            return (
              <Accordion.Item key={entityIndex} eventKey={entityIndex}>
                <Accordion.Header>
                  {entity.name}

                  { !this.props.readOnly ?
                    <div className='flex-grow-1 d-flex justify-content-end me-4'>
                      <Form.Check
                        type='checkbox'
                        label='Share information'
                        checked={shared}
                        onClick={(e) => { e.stopPropagation(); this.setShare(entity.enid, !shared) }}
                      />
                    </div>
                    : null
                  }
                </Accordion.Header>
                <Accordion.Body>
                  {entity.description}

                  <h4 className='mt-4'>Projects</h4>
                  <Accordion>
                    {this.props.projects[entity.enid] ? this.props.projects[entity.enid].map((project, projectIndex) => (
                      <Accordion.Item key={projectIndex} eventKey={projectIndex}>
                        <Accordion.Header>
                          {project.name}
                        </Accordion.Header>
                        <Accordion.Body>
                          <p>{project.description}</p>

                          <Button onClick={() => this.setState({ popup: { enid: entity.enid, entityIndex, projectIndex } })}>More information</Button>
                        </Accordion.Body>
                      </Accordion.Item>
                    )) : null}
                  </Accordion>

                </Accordion.Body>
              </Accordion.Item>
            )
          })}
        </Accordion>

        {this.state.popup ?
          this.renderProjectModal()
          : null}
      </>
    );
  }
}

export default EntitiesProjects