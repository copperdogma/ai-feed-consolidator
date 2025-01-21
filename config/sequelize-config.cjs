module.exports = {
  development: {
    use_env_variable: 'DATABASE_URL',
    dialect: 'postgres',
    dialectOptions: { bigNumberStrings: true }
  },
  test: {
    use_env_variable: 'DATABASE_URL',
    dialect: 'postgres',
    dialectOptions: { bigNumberStrings: true }
  },
  production: {
    use_env_variable: 'DATABASE_URL',
    dialect: 'postgres',
    dialectOptions: { bigNumberStrings: true }
  }
}; 