import React from 'react'
import { Button, Accordion, Modal, Form, Row, Col } from 'react-bootstrap'
import api from '../../api'

const httpRegex = /^https?:\/\//

class EntitiesProjects extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      sharedEntities: [],
      popup: false,

      shareError: {},
    }
  }

  async componentDidMount() {
    if (this.props.shareControls) {
      const user = await api.user.get(api.getApiTokenData().uid, { share: true }).exec()
      this.setState({ sharedEntities: user.share })
    }
  }

  renderProjectModal = () => {
    const { enid, entityIndex, projectIndex } = this.state.popup
    const entity = this.props.entities[entityIndex]
    const project = this.props.projects[enid][projectIndex]

    return (
      <Modal show={true} onHide={() => this.setState({ popup: false })} fullscreen={true}>
        <Modal.Header closeButton>Project and organisation information</Modal.Header>
        <Modal.Body>
          <Row className='d-flex justify-content-around'>
            <Col xs={12} lg={6} className='mb-4'>
              <h1>{project.name}</h1>
              <h4>About the project</h4>
              <div dangerouslySetInnerHTML={{ __html: project.description }} />

              <h4 className='mt-4'>Datanose link</h4>
              <a href={project.datanoseLink} target='_blank' rel='noreferrer'>
                {project.datanoseLink}
              </a>
            </Col>

            <hr className='d-lg-none mb-4' />

            <Col xs={12} lg={6}>
              <h1>{entity.name}</h1>
              <h4>About the organisation</h4>
              {entity.description}

              <h4 className='mt-4 mb-0'>Interested in this project?</h4>
              <h6>Please contact them using one of the methods below</h6>
              <ul>
                {entity.contact.map((contact, i) => {
                  let prefix = ''
                  if (contact.type === 'email') {
                    prefix = 'mailto:'
                  } else if (contact.type === 'phonenumber') {
                    prefix = 'tel:'
                  } else if (contact.type === 'website') {
                    if (!httpRegex.test(contact.content)) {
                      prefix = 'https://'
                    }
                  } else {
                    console.error('unkown contact type', contact.type)
                    return null
                  }

                  return (
                    <li key={i}>
                      <a href={prefix + contact.content} target='_blank' rel='noreferrer'>
                        {contact.content}
                      </a>
                    </li>
                  )
                })}
              </ul>
            </Col>
          </Row>
        </Modal.Body>
      </Modal>
    )
  }

  setShare = async (enid, state) => {
    try {
      await api.user.student.shareInfo(api.getApiTokenData().uid, enid, state).exec()
    } catch (error) {
      if (!error.errors) {
        throw error
      }

      this.setState({ shareError: { message: error.errors[0].message, enid } })
      return
    }

    const sharedEntities = [...this.state.sharedEntities]
    if (state) {
      sharedEntities.push(enid)
    } else {
      sharedEntities.splice(sharedEntities.indexOf(enid), 1)
    }
    this.setState({ sharedEntities })
  }

  render() {
    return (
      <>
        <Accordion>
          {this.props.entities.map((entity, entityIndex) => {
            const shared = this.state.sharedEntities.includes(entity.enid)
            return (
              <Accordion.Item key={entityIndex} eventKey={entityIndex}>
                <Accordion.Header>
                  {entity.name}

                  {this.props.shareControls ? (
                    <div className='flex-grow-1 d-flex justify-content-end me-4'>
                      {this.state.shareError.enid === entity.enid ? (
                        <h6 className='pe-4' style={{ color: 'red' }}>
                          {this.state.shareError.message}
                        </h6>
                      ) : null}
                      <Form.Check
                        type='checkbox'
                        label='Share information'
                        checked={shared}
                        onClick={e => {
                          e.stopPropagation()
                        }}
                        onChange={e => {
                          this.setShare(entity.enid, !shared)
                        }}
                      />
                    </div>
                  ) : null}
                </Accordion.Header>
                <Accordion.Body>
                  {entity.description}

                  <h4 className='mt-4'>Projects</h4>
                  <Accordion>
                    {this.props.projects[entity.enid]
                      ? this.props.projects[entity.enid].map((project, projectIndex) => (
                          <Accordion.Item key={projectIndex} eventKey={projectIndex}>
                            <Accordion.Header>{project.name}</Accordion.Header>
                            <Accordion.Body>
                              <div dangerouslySetInnerHTML={{ __html: project.description }} />

                              <Button
                                onClick={() =>
                                  this.setState({ popup: { enid: entity.enid, entityIndex, projectIndex } })
                                }
                              >
                                More information
                              </Button>
                            </Accordion.Body>
                          </Accordion.Item>
                        ))
                      : null}
                  </Accordion>
                </Accordion.Body>
              </Accordion.Item>
            )
          })}
        </Accordion>

        {this.state.popup ? this.renderProjectModal() : null}
      </>
    )
  }
}

export default EntitiesProjects
