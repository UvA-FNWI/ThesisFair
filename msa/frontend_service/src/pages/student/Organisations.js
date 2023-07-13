import React from 'react'

import EntityCard from '../../components/entityCard/entityCard'
import { useParams, Link } from 'react-router-dom'
import { Row, Col, Button } from 'react-bootstrap'
import api from '../../api'

import '../../styles/events.scss'

class Entities extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      entities: [],
    }
  }

  async componentDidMount() {
    let entities

    try {
      entities = await api.entity.getAll().exec()
    } catch (error) {
      console.log(error)
    }

    this.setState({ entities })
  }

  render() {
    return (
      <>
        <h1 className='events-page__header'>Organisations</h1>
        {api.getApiTokenData().type === 'a' && (
          <Link to='/organisation/create/'>
            <Button variant='outline-primary'>Create new organisation</Button>
          </Link>
        )}
        {this.state.entities.length > 0 ? (
          <Row className='g-4 events-page__row'>
            {this.state.entities.map(entity => (
              <Col md='auto'>
                <EntityCard entity={entity} />
              </Col>
            ))}
          </Row>
        ) : (
          <p>Loading...</p>
        )}
      </>
    )
  }
}

function EntitiesWithParams(props) {
  const params = useParams()

  return <Entities {...props} params={params} />
}

export default EntitiesWithParams
