const typeDefs = `#graphql
  type User {
    id: ID!
    email: String!
    name: String!
    avatar: String
    preferredCurrency: String!
  }

  type Group {
    id: ID!
    name: String!
    type: String!
    currency: String!
    members: [GroupMember!]!
    expenses: [Expense!]!
    balances: [Balance!]!
  }

  type GroupMember {
    id: ID!
    userId: ID!
    role: String!
    user: User!
  }

  type Expense {
    id: ID!
    description: String!
    amount: Float!
    currency: String!
    splitType: String!
    date: String!
    payers: [ExpensePayer!]!
    splits: [ExpenseSplit!]!
    category: Category
    creator: User!
  }

  type ExpensePayer {
    userId: ID!
    amount: Float!
    user: User!
  }

  type ExpenseSplit {
    userId: ID!
    amount: Float!
    percentage: Float
    shares: Int
    user: User!
  }

  type Settlement {
    id: ID!
    fromUser: User!
    toUser: User!
    amount: Float!
    currency: String!
    status: String!
    settledAt: String!
  }

  type Balance {
    userId: ID!
    userName: String!
    balance: Float!
  }

  type DebtEdge {
    from: ID!
    fromName: String!
    to: ID!
    toName: String!
    amount: Float!
  }

  type Category {
    id: ID!
    name: String!
    icon: String!
    color: String!
  }

  type Transaction {
    id: ID!
    type: String!
    amount: Float!
    currency: String!
    description: String!
    category: Category
    account: String!
    date: String!
  }

  type TransactionSummary {
    totalIncome: Float!
    totalExpenses: Float!
    netBalance: Float!
  }

  type Budget {
    id: ID!
    categoryId: ID
    limitAmount: Float!
    period: String!
    spent: Float!
    remaining: Float!
    percentage: Float!
  }

  type ExpenseConnection {
    data: [Expense!]!
    total: Int!
    page: Int!
    totalPages: Int!
  }

  type TransactionConnection {
    data: [Transaction!]!
    total: Int!
    page: Int!
    totalPages: Int!
  }

  type Query {
    me: User
    groups: [Group!]!
    group(id: ID!): Group
    groupExpenses(groupId: ID!, page: Int, limit: Int): ExpenseConnection!
    groupBalances(groupId: ID!): [Balance!]!
    simplifiedDebts(groupId: ID!): [DebtEdge!]!
    transactions(page: Int, limit: Int, type: String): TransactionConnection!
    transactionSummary(startDate: String, endDate: String): TransactionSummary!
    budgets: [Budget!]!
    categories: [Category!]!
  }

  type Mutation {
    createGroup(input: CreateGroupInput!): Group!
    createExpense(input: CreateExpenseInput!): Expense!
    createSettlement(input: CreateSettlementInput!): Settlement!
    createTransaction(input: CreateTransactionInput!): Transaction!
  }

  input CreateGroupInput {
    name: String!
    type: String
    currency: String
  }

  input CreateExpenseInput {
    groupId: ID!
    amount: Float!
    currency: String
    description: String!
    splitType: String!
    payers: [PayerInput!]!
    splits: [SplitInput!]!
  }

  input PayerInput {
    userId: ID!
    amount: Float!
  }

  input SplitInput {
    userId: ID!
    amount: Float
    percentage: Float
    shares: Int
  }

  input CreateSettlementInput {
    groupId: ID!
    toUserId: ID!
    amount: Float!
    currency: String
  }

  input CreateTransactionInput {
    type: String!
    amount: Float!
    currency: String
    description: String!
    categoryId: ID
    account: String!
  }
`;

export { typeDefs };
