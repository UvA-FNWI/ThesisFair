import React from 'react'
import { Modal, Spinner } from 'react-bootstrap'
import api from '../../api'

class StudentPopup extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      cv: false,
    }
  }

  render() {
    const { student } = this.props
    const { cv } = this.state

    if (this.state.cv === false) {
      api.user.student
        .getCV(student.uid)
        .exec()
        .then(cv => {
          this.setState({ cv })
        })
    }

    return (
      <Modal show={true} onHide={this.props.onHide} size='xl'>
        <Modal.Header closeButton>Student information</Modal.Header>
        <Modal.Body>
          <h1>
            {student.firstname} {student.lastname}
          </h1>

          <div className='row'>
            <div className='col-12 col-sm-6 col-lg-4'>
              <h4 className='mt-4'>Contact information</h4>
              <span className='d-block'>Email: {student.email || 'Not given'}</span>
              <span className='d-block'>Phone number: {student.phone || 'Not given'}</span>
            </div>

            <div className='col-12 col-sm-6 col-lg-4'>
              <h4 className='mt-4'>Links</h4>
              <ul>
                {student.websites.map((website, i) => (
                  <li key={i}>
                    <a href={website} target='_blank' rel='noreferrer'>
                      {website}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div className='col-12 col-sm-6 col-lg-4'>
              <h4 className='mt-4'>Studies</h4>
              <ul>
                {student.studies.map((study, i) => (
                  <li key={i}>{study}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className='mt-4'>
            <h4>CV</h4>
            {cv ? (
              <embed style={{ width: '100%', minHeight: '95vh' }} src={cv} />
            ) : cv === false ? (
              <div
                style={{ width: '100%', minHeight: '95vh' }}
                className='d-flex justify-content-center align-items-center'
              >
                <Spinner animation='border' />
              </div>
            ) : (
              <h6>This student has not uploaded a CV.</h6>
            )}
          </div>
        </Modal.Body>
      </Modal>
    )
  }
}

export default StudentPopup
