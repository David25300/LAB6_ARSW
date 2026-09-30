// Comunica el mock y el real conrolado en el .env
//   VITE_USE_MOCK=true   -> usa apimock.js (datos en memoria, sin backend)
//   VITE_USE_MOCK=false  -> usa apiclient.js (API REST real via Axios)

import apimock from './apimock.js'
import apiclient from './blueprintsApiClient.js'

const useMock = import.meta.env.VITE_USE_MOCK === 'true'

const blueprintsService = useMock ? apimock : apiclient

export default blueprintsService
