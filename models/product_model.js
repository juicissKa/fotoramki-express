const { Sequelize, DataTypes, Op } = require("sequelize");

require("dotenv").config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.USER,
  process.env.PASSWORD,
  {
    host: process.env.HOST,
    dialect: "postgres",
    dialectOptions: {},
  }
);

const testDbConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log("Connection has been established successfully.");
  } catch (error) {
    console.error("Unable to connect to the database:", error);
  }
};

testDbConnection();

const Product = sequelize.define(
  "product",
  {
    images: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
    },
  },
  { timestamps: false }
);

const ProductInfo = sequelize.define(
  "product_info",
  {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  { timestamps: false }
);

ProductInfo.hasMany(Product, {
  foreignKey: { name: "product_info_id", allowNull: false },
  onDelete: "CASCADE",
});
Product.belongsTo(ProductInfo, {
  foreignKey: { name: "product_info_id", allowNull: false },
  onDelete: "CASCADE",
});

const ProductProperty = sequelize.define(
  "product_property",
  {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    value: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    eng_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  { timestamps: false }
);

const ProductPropertyLink = sequelize.define(
  "product_property_link",
  {
    product_id: {
      type: DataTypes.INTEGER,
      references: {
        model: Product, // 'Movies' would also work
        key: "id",
        allowNull: false,
      },
    },
    property_id: {
      type: DataTypes.INTEGER,
      references: {
        model: ProductProperty, // 'Actors' would also work
        key: "id",
        allowNull: false,
      },
    },
  },
  { timestamps: false }
);

Product.belongsToMany(ProductProperty, {
  foreignKey: { name: "product_id", allowNull: false },
  through: ProductPropertyLink,
});
ProductProperty.belongsToMany(Product, {
  foreignKey: { name: "property_id", allowNull: false },
  through: ProductPropertyLink,
});

const ProductChild = sequelize.define(
  "product_child",
  {
    count: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
  },
  { timestamps: false }
);

Product.hasMany(ProductChild, {
  foreignKey: { name: "product_id", allowNull: false },
  onDelete: "CASCADE",
});
ProductChild.belongsTo(Product, {
  foreignKey: { name: "product_id", allowNull: false },
  onDelete: "CASCADE",
});

const ChildProperty = sequelize.define(
  "child_property",
  {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    value: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    eng_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  { timestamps: false }
);

ChildProperty.hasMany(ProductChild, {
  foreignKey: { name: "property_id", allowNull: false },
  onDelete: "CASCADE",
});
ProductChild.belongsTo(ChildProperty, {
  foreignKey: { name: "property_id", allowNull: false },
  onDelete: "CASCADE",
});

sequelize.sync().then(() => {
  console.log("Models synced");
});

function getProducts(params) {
  return new Promise(function (resolve, reject) {
    const querySettings = {};
    const sort =
      params.sortBy && params.orderBy
        ? [params.sortBy, params.orderBy]
        : ["id", "desc"];

    console.log(sort);

    if (params.title) {
      querySettings.title = { [Op.iLike]: `%${params.title}%` };
    }

    const func = async () => {
      try {
        const result = await Product.findAndCountAll({
          attributes: ["id", "images"],
          distinct: true,
          limit: 12,

          include: [
            { model: ProductInfo },
            { model: ProductProperty, through: { attributes: [] } },
            {
              model: ProductChild,
              attributes: ["id", "price", "count"],
              include: [{ model: ChildProperty }],
              order: [["price", "asc"]],
            },
          ],
        });
        resolve(result);
      } catch (err) {
        console.log(err);
        reject(err);
      }
    };

    func();
  });
}

function getProductById(id) {
  return new Promise(function (resolve, reject) {
    console.log(id);

    const func = async () => {
      try {
        const result = await Product.findByPk(id, {
          attributes: ["id", "images"],
          include: [
            { model: ProductInfo },
            { model: ProductProperty, through: { attributes: [] } },
            {
              model: ProductChild,
              attributes: ["id", "price", "count"],
              include: [{ model: ChildProperty }],
            },
          ],
        });
        resolve(result);
      } catch (err) {
        console.log(err);
        reject(err);
      }
    };

    func();
  });
}

function getFilters() {
  return new Promise(function (resolve, reject) {
    const func = async () => {
      try {
        const productProperties = await ProductProperty.findAll({});
        const childProperties = await ChildProperty.findAll({});
        const productResult = productProperties.reduce((newArr, prop) => {
          const obj_index = newArr.findIndex((o) => o.name === prop.name);

          if (obj_index !== -1) {
            newArr[obj_index].filters.push({ id: prop.id, value: prop.value });
          } else {
            newArr.push({
              name: prop.name,
              eng_name: prop.eng_name,
              filters: [{ id: prop.id, value: prop.value }],
            });
          }
          return newArr;
        }, []);

        const childResult = childProperties.reduce((newArr, prop) => {
          const obj_index = newArr.findIndex((o) => o.name === prop.name);

          if (obj_index !== -1) {
            newArr[obj_index].filters.push({ id: prop.id, value: prop.value });
          } else {
            newArr.push({
              name: prop.name,
              eng_name: prop.eng_name,
              filters: [{ id: prop.id, value: prop.value }],
            });
          }
          return newArr;
        }, []);

        const result = { product: productResult, child: childResult };

        resolve(result);
      } catch (err) {
        console.log(err);
        reject(err);
      }
    };
    func();
  });
}

module.exports = {
  getProducts,
  getProductById,
  getFilters,
};
