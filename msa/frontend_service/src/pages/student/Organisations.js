import fuzzysort from 'fuzzysort'
import React from 'react'
import { Container, Form } from 'react-bootstrap'
import { useParams } from 'react-router-dom'

import api from '../../api'
import EntityList from '../../components/entityList/entityList'

import '../../styles/events.scss'

class Entities extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      entities: [],
      allEvents: [],
      allEventsByEvid: {},
      entitiesByEnid: {},
      entityNames: [],
      filteredEntities: [],
      searchFilter: '',
      error: false,
      filters: {
        search: '',
      },
    }
  }

  searchFilterFunction = (entities, filters) => {
    if (!filters.search) return entities

    return fuzzysort
      .go(filters.search, this.state.entityNames, { key: 'name', limit: 25, threshold: -5000 })
      .map(e => this.state.entitiesByEnid[e.obj.enid])
  }

  filterFunctions = [this.searchFilterFunction]

  filter = filters => {
    const filteredEntities = this.filterFunctions.reduce(
      (entities, filterFunction) => filterFunction(entities, filters),
      this.state.entities
    )

    this.setState({ filteredEntities })
  }

  search = searchFilter => {
    if (searchFilter === this.state.filters.search) return

    if (searchFilter === '' || searchFilter === null) {
      const filters = { ...this.state.filters, search: '' }

      this.setState({ filters })
      this.filter(filters)
      return
    }

    const filters = { ...this.state.filters, search: searchFilter }

    this.setState({ filters })

    this.filter(filters)
  }

  async componentDidMount() {
    let entities
    try {
      entities = await api.entity.getAll(null, { enid: true, name: true, type: true, payments: true }).exec()
    } catch (error) {
      console.log(error)
      this.setState({ error: true })
    }

    if (!entities || entities.length === 0) {
      this.setState({ error: true })
      return
    }

    entities = entities.map(entity => ({ ...entity, name: entity.name.trim() }))

    // Fetch info about all events to pass on to entries on entities, so they
    // don't have to fetch it (state passes down)
    let events
    try {
      events = await api.event.getAll().exec()
    } catch (error) {
      console.log(error)
      this.setState({ error: true })
    }

    if (!events || events.length === 0) {
      this.setState({ error: true })
      return
    }

    const entityNames = entities.map(entity => ({ enid: entity.enid, name: entity.name }))
    const entitiesByEnid = Object.fromEntries(entities.map(entity => [entity.enid, entity]))
    const allEventsByEvid = Object.fromEntries(events.map(event => [event.evid, event]))

    this.setState({
      entities,
      entitiesByEnid,
      entityNames,
      filteredEntities: entities,
      allEvents: events,
      allEventsByEvid,
    })
  }

  changeEntityType = async (enid, event) => {
    const type = event.target.value

    const entity = {
      enid,
      type,
    }

    try {
      await api.entity.update(entity).exec()
    } catch (error) {
      console.log(error)
    }
  }

  getNoResultText() {
    switch (true) {
      // First case assumes there is at least one entity
      case !this.state.error && this.state.entities?.length === 0:
        return 'Loading...'
      case !this.state.error && this.state.filteredEntities?.length === 0:
        return 'No organisations found with the given filters and/or search term.'
      default:
        return 'Something went wrong while loading the organisations.'
    }
  }

  render() {
    return (
      <Container>
        <h1 className='events-page__header'>Organisations</h1>

        {/* TODO: Maybe add filters for students? */}
        {/* <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
          {entityTypes.map(type => {
            return (
              <Tag
                key={type}
                label={type.length === 1 ? `Type ${type}` : type}
                className='mr-2'
                selectable={true}
                selected={this.state.filters.degrees.includes(type.replace(' ', ''))}
                onClick={() => {
                  let filters

                  if (this.state.filters.degrees.includes(type.replace(' ', ''))) {
                    filters = {
                      ...this.state.filters,
                      types: this.state.filters.degrees.filter(t => t !== type.replace(' ', '')),
                    }

                    this.setState({ filters })
                  } else {
                    filters = { ...this.state.filters, types: [...this.state.filters.degrees, type.replace(' ', '')] }

                    this.setState({ filters })
                  }

                  this.filter(filters)
                }}
              />
            )
          })}
        </div> */}

        <Form className='search-bar'>
          <Form.Group className='mb-3' controlId='searchBar'>
            <Form.Control type='text' placeholder='Search organisations' onInput={e => this.search(e.target.value)} />
          </Form.Group>
        </Form>

        {this.state.filteredEntities?.length > 0 ? (
          <EntityList
            items={this.state.filteredEntities.map(entity => ({
              enid: entity.enid,
              name: entity.name,

              // TODO: Add description et al
            }))}
          />
        ) : (
          <p>{this.getNoResultText()}</p>
        )}
      </Container>
    )
  }
}

function EntitiesWithParams(props) {
  const params = useParams()

  return <Entities {...props} params={params} />
}

export default EntitiesWithParams
