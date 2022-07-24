import React from 'react';
import { Container, Row, Col, Form, Button, CloseButton, Accordion, Modal } from 'react-bootstrap';
import { useParams } from 'react-router-dom';
import api from '../../api';

const httpRegex = /^https?:\/\//

class Organisations extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      entities: [],
      projects: {},
      popup: false,
    };
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

  render() {
    return (
      <Container className='mt-2'>
        <h1 className='mb-4'>Organisations</h1>
        <Accordion>
          {this.state.entities.map((entity, entityIndex) => (
            <Accordion.Item key={entityIndex} eventKey={entityIndex}>
              <Accordion.Header>
                {entity.name}
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
          ))}
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
