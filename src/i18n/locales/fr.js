// Messages fr : un fichier par domaine dans ./fr/, rangé sous son nom (ex. errors.js → t('errors.X'))
const modules = import.meta.glob('./fr/*.js', { eager: true })

export default Object.fromEntries(
  Object.entries(modules).map(([path, mod]) => [path.match(/([\w-]+)\.js$/)[1], mod.default]),
)
