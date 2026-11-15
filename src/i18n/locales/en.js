// Messages en : un fichier par domaine dans ./en/, rangé sous son nom (ex. errors.js → t('errors.X'))
const modules = import.meta.glob('./en/*.js', { eager: true })

export default Object.fromEntries(
  Object.entries(modules).map(([path, mod]) => [path.match(/([\w-]+)\.js$/)[1], mod.default]),
)
