-- =============================================================================
-- Schema do banco de dados (Turso / libSQL — SQLite)
-- Rodar com:
--   npm run db:migrate:local   (local, via .env.local)
--   npm run db:migrate:remote  (produção, via .env)
-- =============================================================================

PRAGMA foreign_keys = ON;

-- -----------------------------------------------------------------------------
-- admin_users: usuários do painel administrativo
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- -----------------------------------------------------------------------------
-- store_settings: linha única (id = 1) com as configurações da loja
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS store_settings (
  id                 INTEGER PRIMARY KEY CHECK (id = 1),
  store_name         TEXT NOT NULL DEFAULT 'Doceria',
  tagline            TEXT NOT NULL DEFAULT 'Doces artesanais feitos com carinho',
  logo_url           TEXT,
  banner_url         TEXT,
  is_open            INTEGER NOT NULL DEFAULT 1,          -- 1 = aberta, 0 = fechada
  address             TEXT,
  hours_text          TEXT,                                 -- ex: "Ter a Sáb, 9h às 19h"
  whatsapp_number     TEXT,                                  -- só dígitos, com DDI. ex: 5511999999999
  delivery_fee_cents  INTEGER NOT NULL DEFAULT 0,
  min_order_cents     INTEGER NOT NULL DEFAULT 0,
  pix_key             TEXT,
  pix_key_type        TEXT,                                  -- cpf | cnpj | email | telefone | aleatoria
  pix_qr_url          TEXT,
  updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO store_settings (id, store_name, tagline, is_open)
VALUES (1, 'Doceria', 'Doces artesanais feitos com carinho', 1);

-- -----------------------------------------------------------------------------
-- categories: categorias do cardápio (abas)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  slug       TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active     INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_categories_sort ON categories (sort_order);

-- -----------------------------------------------------------------------------
-- products: itens do cardápio
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id  INTEGER NOT NULL REFERENCES categories (id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  slug         TEXT NOT NULL UNIQUE,
  description  TEXT,
  price_cents  INTEGER NOT NULL,
  image_url    TEXT,
  featured     INTEGER NOT NULL DEFAULT 0,
  active       INTEGER NOT NULL DEFAULT 1,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  stock_quantity INTEGER CHECK (stock_quantity IS NULL OR stock_quantity >= 0), -- NULL = não controla estoque
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products (category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products (active);

-- -----------------------------------------------------------------------------
-- addon_groups: grupos de acompanhamentos/adicionais por produto
-- ex: "Escolha a cobertura", "Embalagem para presente"
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS addon_groups (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id  INTEGER NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  required    INTEGER NOT NULL DEFAULT 0,   -- 1 = obrigatório escolher
  multiple    INTEGER NOT NULL DEFAULT 0,   -- 1 = permite múltipla escolha
  min_select  INTEGER NOT NULL DEFAULT 0,
  max_select  INTEGER NOT NULL DEFAULT 1,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_addon_groups_product ON addon_groups (product_id);

-- -----------------------------------------------------------------------------
-- addon_options: as opções dentro de cada grupo (com preço adicional opcional)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS addon_options (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id    INTEGER NOT NULL REFERENCES addon_groups (id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  price_cents INTEGER NOT NULL DEFAULT 0,
  active      INTEGER NOT NULL DEFAULT 1,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_addon_options_group ON addon_options (group_id);

-- -----------------------------------------------------------------------------
-- orders: pedidos feitos pelos clientes
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  public_code        TEXT NOT NULL UNIQUE,      -- código curto exibido ao cliente, ex: "A1B2C3"
  customer_name      TEXT NOT NULL,
  customer_phone     TEXT NOT NULL,
  delivery_type      TEXT NOT NULL CHECK (delivery_type IN ('pickup', 'delivery')),
  address             TEXT,
  neighborhood        TEXT,
  reference_point     TEXT,
  payment_method      TEXT NOT NULL CHECK (payment_method IN ('pix', 'card', 'cash')),
  change_for_cents    INTEGER,                   -- troco para quanto (se dinheiro)
  notes                TEXT,
  subtotal_cents      INTEGER NOT NULL,
  delivery_fee_cents  INTEGER NOT NULL DEFAULT 0,
  total_cents         INTEGER NOT NULL,
  status               TEXT NOT NULL DEFAULT 'received'
                        CHECK (status IN ('received', 'confirmed', 'preparing', 'out_for_delivery', 'ready', 'completed', 'cancelled')),
  whatsapp_sent        INTEGER NOT NULL DEFAULT 0,
  is_manual_entry      INTEGER NOT NULL DEFAULT 0 CHECK (is_manual_entry IN (0, 1)), -- 1 = lançado pelo admin (telefone/presencial)
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders (created_at);

-- -----------------------------------------------------------------------------
-- order_items: itens de cada pedido (snapshot do produto no momento da compra)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_items (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id         INTEGER NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  product_id       INTEGER REFERENCES products (id) ON DELETE SET NULL,
  product_name     TEXT NOT NULL,
  unit_price_cents INTEGER NOT NULL,
  quantity         INTEGER NOT NULL DEFAULT 1,
  notes            TEXT
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items (order_id);

-- -----------------------------------------------------------------------------
-- order_item_addons: adicionais escolhidos em cada item do pedido
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_item_addons (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  order_item_id INTEGER NOT NULL REFERENCES order_items (id) ON DELETE CASCADE,
  addon_name    TEXT NOT NULL,
  price_cents   INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_order_item_addons_item ON order_item_addons (order_item_id);
