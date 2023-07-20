import React from 'react'
import fuzzysort from 'fuzzysort'

import EntityCard from '../../components/entityCard/entityCard'
import { useParams, Link } from 'react-router-dom'
import { Row, Col, Button, Form } from 'react-bootstrap'
import api from '../../api'

import '../../styles/events.scss'

class Entities extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      entities: [],
      entitiesByEnid: {},
      entityNames: [],
      filteredEntities: [],
      searchFilter: '',
    }
  }

  search = searchFilter => {
    if (searchFilter === this.state.searchFilter) return
    if (searchFilter === '' || searchFilter === null) {
      this.setState({ filteredEntities: this.state.entities, searchFilter: '' })
      return
    }

    this.setState({
      filteredEntities: fuzzysort
        .go(searchFilter, this.state.entityNames, { key: 'name', limit: 25, threshold: -10000 })
        .map(e => e.obj.enid)
        .map(enid => this.state.entitiesByEnid[enid]),
    })
  }

  async componentDidMount() {
    let entities

    try {
      entities = await api.entity.getAll().exec()
    } catch (error) {
      console.log(error)
    }

    entities = entities.map(entity => ({
      name: entity.name,
      enid: entity.enid,
      type: entity.type,
      description: entity.description,
    }))

    const entityNames = entities.map(entity => ({ enid: entity.enid, name: entity.name }))
    const entitiesByEnid = Object.fromEntries(entities.map(entity => [entity.enid, entity]))

    this.setState({ entities, entitiesByEnid, entityNames, filteredEntities: entities })
  }

  render() {
    console.log(this.state.searchFilter, this.state.entities, this.state.filteredEntities)

    return (
      <>
        <h1 className='events-page__header'>Organisations</h1>
        {api.getApiTokenData().type === 'a' && (
          <>
            <Link to='/organisation/create/'>
              <Button variant='outline-primary'>Create new organisation</Button>
            </Link>

            <Form className='search-bar'>
              <Form.Group className='mb-3' controlId='searchBar'>
                <Form.Control
                  type='text'
                  placeholder='Search'
                  onChange={e => this.setState({ searchFilter: e.target.value })}
                />
              </Form.Group>
            </Form>
          </>
        )}
        {this.state.filteredEntities?.length > 0 ? (
          <Row className='g-4 events-page__row'>
            {this.state.filteredEntities.map(entity => (
              <Col md='auto'>
                <EntityCard entity={entity} />
              </Col>
            ))}
          </Row>
        ) : this.state.searchFilter?.length > 0 ? (
          <p>No organisations found with the given search term</p>
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
