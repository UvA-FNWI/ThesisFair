import React from 'react'
import { Container, CloseButton, Form, Button, Row, Col } from 'react-bootstrap'
import api from '../../api'
import graphqlFields from '../../api/graphqlFields.js'
import CreateUserPopup from '../../components/createUserPopup/createUserPopup'
import RepresentativeList from '../../components/representativeList/representativeList'

class EntityEditor extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      ...Object.fromEntries(graphqlFields['Entity'].map(f => [f, null])),

      savingInfo: false,
      showInfoSaved: false,

      savingContact: false,
      showContactSaved: false,
    }
  }

  async componentDidMount() {
    const entity = this.props.enid ? await api.entity.get(this.props.enid).exec() : {}

    this.setState({
      ...entity,
      ...this.props.entity,
    })
  }

  updateEntityInfo = async e => {
    e.preventDefault()

    this.setState({ savingInfo: true })
    await api.entity
      .update({
        enid: this.state.enid,
        name: this.state.name,
        description: this.state.description,
      })
      .exec()
    this.setState({ savingInfo: false, showInfoSaved: true })
    setTimeout(() => {
      this.setState({ showInfoSaved: false })
    }, 2000)
  }

  updateContactInfo = async e => {
    e.preventDefault()

    this.setState({ savingContact: true })
    await api.entity
      .update({
        enid: this.state.enid,
        contact: this.state.contact,
      })
      .exec()
    this.setState({ savingContact: false, showContactSaved: true })
    setTimeout(() => {
      this.setState({ showContactSaved: false })
    }, 2000)
  }

  contactTypes = {
    website: 'Website',
    email: 'Email',
    phonenumber: 'Phone Number',
  }

  render() {
    return (
      <>
        <Container className='mt-2'>
          <h2>Organisation Information</h2>
          <h6>
            <em>This is what the students will see.</em>
          </h6>
          <div className='mb-4'>
            <div>
              <Form onSubmit={this.updateEntityInfo}>
                <div className='mb-2'>
                  <Form.Group>
                    <Form.Label>Name</Form.Label>
                    <Form.Control
                      placeholder='Enter organisation name'
                      value={this.state.name || ''}
                      onChange={e => this.setState({ name: e.target.value })}
                      required
                    />
                  </Form.Group>
                  <Form.Group>
                    <Form.Label>Description</Form.Label>
                    <Form.Control
                      as='textarea'
                      rows={8}
                      placeholder='Enter description'
                      value={this.state.description || ''}
                      onChange={e => this.setState({ description: e.target.value })}
                      required
                    />
                  </Form.Group>
                </div>

                <div className='d-flex gap-2 align-items-center'>
                  <Button type='submit' disabled={this.savingInfo}>
                    {this.savingInfo ? 'Saving...' : 'Update information'}
                  </Button>
                  {this.state.showInfoSaved ? <h6 style={{ color: 'green', margin: 0 }}>Saved</h6> : null}
                </div>
              </Form>
            </div>
          </div>

          <div className='mb-4'>
            <h2>Organisation Contact Information</h2>
            <Form onSubmit={this.updateContactInfo}>
              {this.state.contact &&
                this.state.contact.map((contact, i) => (
                  <Row key={i}>
                    <Col xs={2}>
                      <p
                        className='contact-item__header'
                        style={{
                          width: '100%',
                          padding: '0.375rem',
                          border: '1px solid rgb(206, 212, 218)',
                          borderRadius: '0.25rem',
                        }}
                      >
                        {this.contactTypes[contact.type]}
                      </p>
                    </Col>
                    <Col style={{ position: 'relative' }}>
                      <Form.Control
                        className='mb-2'
                        value={contact.content}
                        onChange={e => {
                          const newContact = [...this.state.contact]
                          newContact[i].content = e.target.value
                          this.setState({ contact: newContact })
                        }}
                      />
                      <CloseButton
                        style={{ position: 'absolute', top: '7px', right: '18px' }}
                        onClick={() => {
                          const newContact = [...this.state.contact]
                          newContact.splice(i, 1)
                          this.setState({ contact: newContact })
                        }}
                      />
                    </Col>
                  </Row>
                ))}

              <div className='d-flex gap-2 align-items-center'>
                <Button type='submit' disabled={this.savingContact}>
                  {this.savingContact ? 'Saving...' : 'Update contact information'}
                </Button>
                {this.state.showContactSaved ? <h6 style={{ color: 'green', margin: 0 }}>Saved</h6> : null}
              </div>
            </Form>
          </div>

          <div>
            <h2>Company Accounts</h2>
            {this.state.enid && <RepresentativeList enid={this.state.enid} />}
          </div>
        </Container>

        {this.state.newUserPopup ? (
          <CreateUserPopup close={() => this.setState({ newUserPopup: false })} create={this.createUser} />
        ) : null}
      </>
    )
  }
}

export default EntityEditor
