import React from 'react'
import { Container, CloseButton, Form, Button, Row, Col } from 'react-bootstrap'
import api from '../../api'
import graphqlFields from '../../api/graphqlFields.js'
import RepresentativeList from '../../components/representativeList/representativeList'

import AddIcon from 'bootstrap-icons/icons/plus.svg'
import AddContactPopup from '../../components/addContactPopup/addContactPopup'

class EntityEditor extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      ...Object.fromEntries(graphqlFields['Entity'].map(f => [f, null])),
      paymentsByDate: {}, // Mapping from a date to corresponding payments for events on that date
      fairs: [],

      savingInfo: false,
      showInfoSaved: false,

      savingContact: false,
      showContactSaved: false,

      isCreate: !props.enid,
      type: 'unknown',
      enid: props.enid,
    }
  }

  async componentDidMount() {
    const entity = this.state.enid ? await api.entity.get(this.state.enid).exec() : {}

    this.setState({
      ...entity,
      paymentsByDate: Object.fromEntries(entity.payments.map(
        payment => [new Date(payment.eventDate).setHours(0, 0, 0, 0), payment]
      )),
      ...this.props.entity,
    })

    const fairs = await Promise.all(entity.evids.map(evid => api.event.get(evid).exec()))
    this.setState({fairs})
  }

  createUser = async user => {
    let newUser
    try {
      newUser = await api.user.representative
        .create({
          enid: this.state.enid,
          ...user,
        })
        .exec()
    } catch (error) {
      if (error.errors) {
        return error.errors[0].message
      }

      throw error
    }

    const newUsers = [...this.state.users]
    newUsers.push(newUser)
    this.setState({ users: newUsers })
    return null
  }

  updateEntityInfo = async e => {
    e.preventDefault()

    this.setState({ savingInfo: true })

    if (this.state.isCreate) {
      let entity

      try {
        entity = await api.entity
          .create({
            name: this.state.name,
            description: this.state.description || '',
            type: this.state.type,
            representatives: 1,
          })
          .exec()
      } catch (error) {
        return console.log(error)
      }

      this.setState({ enid: entity.enid, isCreate: false })

      try {
        await api.user.representative
          .create({
            enid: entity.enid,
            firstname: this.state.representativeFirstName,
            lastname: this.state.representativeLastName,
            email: this.state.representativeEmail,
            phone: '',
          })
          .exec()
      } catch (error) {
        if (error.errors) {
          return error.errors[0].message
        }

        throw error
      }
    } else {
      try {
        await api.entity
          .update({
            enid: this.state.enid,
            name: this.state.name,
            description: this.state.description,
          })
          .exec()
      } catch (error) {
        console.log(error)
      }
    }

    this.setState({ savingInfo: false, showInfoSaved: true })
    setTimeout(() => {
      this.setState({ showInfoSaved: false })
    }, 2000)
  }

  addContactEntry = async ({ type, value }) => {
    const newContact = [...this.state.contact]
    newContact.push({ type, content: value })
    this.setState({ contact: newContact, savingContact: true })

    try {
      await api.entity
        .update({
          enid: this.state.enid,
          contact: newContact,
        })
        .exec()
    } catch (error) {
      console.log(error)
    }

    this.setState({ savingContact: false, showContactSaved: true })
    setTimeout(() => {
      this.setState({ showContactSaved: false })
    }, 2000)
  }

  updateContactInfo = async e => {
    e.preventDefault()

    this.setState({ savingContact: true })

    try {
      await api.entity
        .update({
          enid: this.state.enid,
          contact: this.state.contact,
        })
        .exec()
    } catch (error) {
      console.log(error)
    }

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

  async getPaymentLink(evid) {
    console.log("Brïh")
    if (this.state.paymentLink) {
      return this.state.paymentLink
    }

    const paymentLink = await api.entity.getPaymentLink(this.state.enid, evid).exec()
    this.setState({paymentLink})

    return paymentLink
  }

  getStatusLabel(status) {
    switch (status) {
      case "failed":
      case "open":
        return "processing"
      case "paid":
        return "paid"
      default:
        return "incomplete"
    }
  }

  render() {
    return (
      <>
        <Container className='mt-4'>
          {this.state.isCreate ? <h2>Create a new organisation</h2> : <h2>Organisation Information</h2>}
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
                    />
                  </Form.Group>
                  {this.state.isCreate && (
                    <>
                      <Form.Group>
                        <Form.Label>Type</Form.Label>
                        <Form.Control
                          as='select'
                          value={this.state.type || ''}
                          onChange={e => this.setState({ type: e.target.value })}
                          required
                        >
                          <option value='A'>A</option>
                          <option value='B'>B</option>
                          <option value='C'>C</option>
                        </Form.Control>
                      </Form.Group>

                      <Row>
                        <Col>
                          <Form.Group>
                            <Form.Label>Representative First Name</Form.Label>
                            <Form.Control
                              placeholder='Enter representative name'
                              value={this.state.representativeFirstName || ''}
                              onChange={e => this.setState({ representativeFirstName: e.target.value })}
                              required
                            />
                          </Form.Group>
                        </Col>
                        <Col>
                          <Form.Group>
                            <Form.Label>Representative Last Name</Form.Label>
                            <Form.Control
                              placeholder='Enter representative name'
                              value={this.state.representativeLastName || ''}
                              onChange={e => this.setState({ representativeLastName: e.target.value })}
                              required
                            />
                          </Form.Group>
                        </Col>
                      </Row>

                      <Form.Group>
                        <Form.Label>Representative Email</Form.Label>
                        <Form.Control
                          placeholder='Enter representative email'
                          value={this.state.representativeEmail || ''}
                          onChange={e => this.setState({ representativeEmail: e.target.value })}
                          required
                        />
                      </Form.Group>
                    </>
                  )}
                </div>

                <div className='d-flex gap-2 align-items-center'>
                  <Button type='submit' disabled={this.savingInfo}>
                    {this.savingInfo ? 'Saving...' : this.state.isCreate ? 'Create organisation' : 'Update information'}
                  </Button>
                  {this.state.showInfoSaved ? <h6 style={{ color: 'green', margin: 0 }}>Saved</h6> : null}
                </div>
              </Form>
            </div>
          </div>

          {!this.state.isCreate && (
            <>
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
                              backgroundColor: 'white',
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
                    <Button
                      onClick={() => this.setState({ addContactEntryPopup: true })}
                      style={{
                        display: 'flex',
                        width: '38px',
                        height: '38px',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <img src={AddIcon} alt='' style={{ width: '24px', height: '24px', filter: 'invert()' }} />
                    </Button>

                    <Button type='submit' disabled={this.savingContact}>
                      {this.savingContact ? 'Saving...' : 'Update contact information'}
                    </Button>
                    {this.state.showContactSaved ? <h6 style={{ color: 'green', margin: 0 }}>Saved</h6> : null}
                  </div>
                </Form>
              </div>

              <div>
                <h2>Company Accounts</h2>
                <RepresentativeList enid={this.state.enid} />
              </div>

              <div>
                <h2>Payment</h2>
                {/* TODO: if two fairs have the same date, put them under a single header with a single pay button */}
                {this.state.fairs.map(fair => <>
                  <h3>{fair.name}</h3>
                  
                  <p>Status: {this.state.paymentsByDate[String(new Date(fair.start).setHours(0, 0, 0, 0))]
                    ? this.getStatusLabel(this.state.paymentsByDate[String(new Date(fair.start).setHours(0, 0, 0, 0))].status)
                    : "incomplete"
                  }</p>
                  <Button onClick={() => this.getPaymentLink(fair.evid).then(url => window.open(url, '_blank').focus())}>
                    Pay
                  </Button>
                </>)}
              </div>

            </>
          )}
        </Container>

        {this.state.addContactEntryPopup ? (
          <AddContactPopup
            enid={this.state.enid}
            close={() => this.setState({ addContactEntryPopup: false })}
            create={this.addContactEntry}
          />
        ) : null}
      </>
    )
  }
}

export default EntityEditor
