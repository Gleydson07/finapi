const { request } = require("express");
const express = require("express");
const {v4: uuidv4} = require("uuid");

const app = express();
const port = 3333;

const customers = [];

app.use(express.json());

//Middlewares
const verifyIfExistsAccountByCPF = (req, res, next) => {
  const {cpf} = req.params;
  const customer = customers.find(item => item.cpf === cpf);

  if(!customer){
    return res.status(400).json({error: "Cliente não encontrado."})
  }

  request.customer = customer;

  return next();
}

const getBalance = (statement) => {
  const balance = statement.reduce((acc, operation) => {
    if(operation.type === "deposit"){
      return acc + operation.value;
    }else{
      return acc - operation.value;
    }
  }, 0);

  return balance;
}

app.get("/", (req, res) => {
  return res.json({message: `Running on port ${port}.`})
});

app.post("/account", (req, res) => {
  const {cpf, name} = req.body;

  const customerAlreadyExists = customers.some(item => item.cpf === cpf);

  if(customerAlreadyExists){
    return res.status(400).json({error: "Customer já existe!"});
  }

  const customer = {
    id:  uuidv4(),
    cpf,
    name,
    statement:[]
  };

  customers.push(customer);
  return res.status(201).send();
  
})

app.get("/account", (req, res) => {
  return res.status(200).json(customers);
})

app.get("/account/:cpf", verifyIfExistsAccountByCPF, (req, res) => {
  const {customer} = req;
  return res.json(customer);
})

app.get("/account/:cpf/statement", verifyIfExistsAccountByCPF, (req, res) => {
  const {customer} = req;
  return res.json(customer.statement);
})

app.get("/account/:cpf/statement/date", verifyIfExistsAccountByCPF, (req, res) => {
  const {customer} = req;
  const {date} = req.query;

  const dateFormat = new Date(date + "00:00");
  const statement = customer.statement.filter(item => 
    item.date.toDateString() === dateFormat.toDateString()
  )

  return res.json(statement);
})

app.post("/account/:cpf/deposit", verifyIfExistsAccountByCPF, (req, res) => {
  const {customer} = req;
  const {value, description} = req.body;

  customers.map(item => {
    if(item.id === customer.id){
      return {
        ...customer,
        statement: customer.statement.push({
          id: uuidv4(),
          description,
          type: "deposit",
          value,
          date: new Date()
        })
      };      
    }
  })

  return res.status(201).send();
})

app.post("/account/:cpf/withdraw", verifyIfExistsAccountByCPF, (req, res) => {
  const {customer} = req;
  const {value, description} = req.body;
  const balance = getBalance(customer.statement);

  if(balance < value){
    return res.status(400).send({error: "Saldo indisponível."})
  }

  customers.map(item => {
    if(item.id === customer.id){
      return {
        ...customer,
        statement: customer.statement.push({
          id: uuidv4(),
          description,
          type: "withdraw",
          value,
          date: new Date()
        })
      };      
    }
  })

  return res.status(201).send();
})

app.put("/account/:cpf", verifyIfExistsAccountByCPF, (req, res) => {
  const {customer} = req;
  const {name} = req.body;

  customer.name = name;

  return res.status(201).send();
})

app.delete("/account/:cpf", verifyIfExistsAccountByCPF, (req, res) => {
  const {customer} = req;
  customers.splice(customer, 1);
  
  return res.status(201).send();
})

app.get("/account/:cpf/balance", verifyIfExistsAccountByCPF, (req, res) => {
  const {customer} = req;
  const balance = getBalance(customer.statement);

  return res.json(balance);
})


app.listen(port);