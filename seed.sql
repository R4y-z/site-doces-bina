-- =============================================================================
-- Dados de exemplo para desenvolvimento/demonstração.
-- Rodar com:
--   wrangler d1 execute doceria-db --local  --file=./seed.sql
--   wrangler d1 execute doceria-db --remote --file=./seed.sql
--
-- O usuário admin NÃO é criado aqui (senha precisa ser hasheada em runtime).
-- Crie o primeiro admin chamando POST /api/auth/setup — veja o README.
-- =============================================================================

-- schema.sql já garante que a linha id=1 existe (com valores padrão), então
-- aqui fazemos um upsert para sobrescrever com os dados de demonstração.
INSERT INTO store_settings (id, store_name, tagline, is_open, address, hours_text, whatsapp_number, delivery_fee_cents, min_order_cents, pix_key, pix_key_type)
VALUES (1, 'Doces da Bina', 'Doces artesanais feitos com carinho', 1,
        'Rua das Flores, 123 - Centro, Sua Cidade - UF',
        'Ter a Sáb, 9h às 19h · Dom, 9h às 13h',
        '5511999999999', 800, 0,
        'contato@docedabina.com.br', 'email')
ON CONFLICT (id) DO UPDATE SET
  store_name = excluded.store_name,
  tagline = excluded.tagline,
  is_open = excluded.is_open,
  address = excluded.address,
  hours_text = excluded.hours_text,
  whatsapp_number = excluded.whatsapp_number,
  delivery_fee_cents = excluded.delivery_fee_cents,
  min_order_cents = excluded.min_order_cents,
  pix_key = excluded.pix_key,
  pix_key_type = excluded.pix_key_type;

INSERT INTO categories (name, slug, sort_order) VALUES
  ('Destaques',            'destaques', 0),
  ('Tortas',               'tortas', 1),
  ('Bombons',              'bombons', 2),
  ('Brigadeiros',          'brigadeiros', 3),
  ('Festa na Marmita',     'festa-na-marmita', 4),
  ('Bebidas',              'bebidas', 5);

INSERT INTO products (category_id, name, slug, description, price_cents, image_url, featured, sort_order) VALUES
  ((SELECT id FROM categories WHERE slug = 'tortas'), 'Torta de Ninho com Nutella', 'torta-ninho-nutella', 'Camadas de massa fofinha, creme de leite ninho e nutella cremosa.', 8900, NULL, 1, 0),
  ((SELECT id FROM categories WHERE slug = 'tortas'), 'Torta de Morango', 'torta-de-morango', 'Massa amanteigada, chantilly e morangos frescos selecionados.', 7900, NULL, 0, 1),
  ((SELECT id FROM categories WHERE slug = 'bombons'), 'Caixa de Bombons Sortidos (12un)', 'caixa-bombons-sortidos-12', 'Seleção da casa com trufas de chocolate ao leite, meio amargo e branco.', 5400, NULL, 1, 0),
  ((SELECT id FROM categories WHERE slug = 'brigadeiros'), 'Brigadeiro Gourmet Tradicional (un)', 'brigadeiro-gourmet-tradicional', 'Feito com chocolate belga e granulado crocante.', 450, NULL, 0, 0),
  ((SELECT id FROM categories WHERE slug = 'brigadeiros'), 'Brigadeiro de Pistache (un)', 'brigadeiro-pistache', 'Recheio cremoso com pistache selecionado.', 650, NULL, 1, 1),
  ((SELECT id FROM categories WHERE slug = 'festa-na-marmita'), 'Marmita Festa Chocolate', 'marmita-festa-chocolate', 'Um mix completo de doces de festa em porção individual.', 3200, NULL, 0, 0),
  ((SELECT id FROM categories WHERE slug = 'bebidas'), 'Chocolate Quente Cremoso', 'chocolate-quente-cremoso', '300ml, feito com chocolate 70% cacau.', 1200, NULL, 0, 0);

-- Grupo de adicionais para a Torta de Ninho com Nutella
INSERT INTO addon_groups (product_id, name, required, multiple, min_select, max_select, sort_order) VALUES
  ((SELECT id FROM products WHERE slug = 'torta-ninho-nutella'), 'Calda extra', 0, 1, 0, 2, 0),
  ((SELECT id FROM products WHERE slug = 'torta-ninho-nutella'), 'Embalagem para presente', 0, 0, 0, 1, 1);

INSERT INTO addon_options (group_id, name, price_cents, sort_order) VALUES
  ((SELECT id FROM addon_groups WHERE name = 'Calda extra' AND product_id = (SELECT id FROM products WHERE slug = 'torta-ninho-nutella')), 'Calda de chocolate', 300, 0),
  ((SELECT id FROM addon_groups WHERE name = 'Calda extra' AND product_id = (SELECT id FROM products WHERE slug = 'torta-ninho-nutella')), 'Calda de morango', 300, 1),
  ((SELECT id FROM addon_groups WHERE name = 'Embalagem para presente' AND product_id = (SELECT id FROM products WHERE slug = 'torta-ninho-nutella')), 'Embrulho + laço', 700, 0);

-- Grupo de adicionais para a Caixa de Bombons
INSERT INTO addon_groups (product_id, name, required, multiple, min_select, max_select, sort_order) VALUES
  ((SELECT id FROM products WHERE slug = 'caixa-bombons-sortidos-12'), 'Talher descartável', 0, 0, 0, 1, 0);

INSERT INTO addon_options (group_id, name, price_cents, sort_order) VALUES
  ((SELECT id FROM addon_groups WHERE name = 'Talher descartável' AND product_id = (SELECT id FROM products WHERE slug = 'caixa-bombons-sortidos-12')), 'Incluir talher', 0, 0);
