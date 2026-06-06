-- ============================================
-- LLAMÍN - Schema de base de datos
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- Tabla de perfiles (extiende auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nombre TEXT NOT NULL DEFAULT 'Usuario',
  nivel INTEGER DEFAULT 1,
  racha_dias INTEGER DEFAULT 0,
  ultima_actividad DATE,
  puntos INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de categorías
CREATE TABLE IF NOT EXISTS categorias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  icono TEXT DEFAULT '📦',
  color TEXT DEFAULT '#784212',
  es_sistema BOOLEAN DEFAULT TRUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Categorías del sistema (datos iniciales)
INSERT INTO categorias (nombre, icono, color, es_sistema) VALUES
  ('Alimentación', '🛒', '#27AE60', TRUE),
  ('Restaurantes', '🍽️', '#E67E22', TRUE),
  ('Delivery', '🛵', '#E74C3C', TRUE),
  ('Transporte', '🚗', '#2980B9', TRUE),
  ('Entretenimiento', '🎬', '#9B59B6', TRUE),
  ('Servicios', '💡', '#F39C12', TRUE),
  ('Salud', '💊', '#E91E63', TRUE),
  ('Educación', '📚', '#3498DB', TRUE),
  ('Moda', '👗', '#FF9800', TRUE),
  ('Deudas/Cuotas', '💳', '#C0392B', TRUE),
  ('Ahorro', '🏦', '#27AE60', TRUE),
  ('Otros', '📦', '#95A5A6', TRUE)
ON CONFLICT DO NOTHING;

-- Tabla de transacciones
CREATE TABLE IF NOT EXISTS transacciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  fecha DATE NOT NULL,
  descripcion TEXT NOT NULL,
  monto DECIMAL(10,2) NOT NULL,
  moneda TEXT DEFAULT 'PEN',
  categoria_id UUID REFERENCES categorias(id),
  tipo TEXT CHECK (tipo IN ('gasto', 'ingreso')) DEFAULT 'gasto',
  fuente TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de presupuestos
CREATE TABLE IF NOT EXISTS presupuestos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  categoria_id UUID REFERENCES categorias(id) NOT NULL,
  monto DECIMAL(10,2) NOT NULL,
  mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
  ano INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, categoria_id, mes, ano)
);

-- Tabla de metas de ahorro
CREATE TABLE IF NOT EXISTS metas_ahorro (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nombre TEXT NOT NULL,
  monto_objetivo DECIMAL(10,2) NOT NULL,
  monto_actual DECIMAL(10,2) DEFAULT 0,
  fecha_objetivo DATE,
  completada BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE transacciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE presupuestos ENABLE ROW LEVEL SECURITY;
ALTER TABLE metas_ahorro ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad
CREATE POLICY "Perfil propio" ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Transacciones propias" ON transacciones FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Presupuestos propios" ON presupuestos FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Metas propias" ON metas_ahorro FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Ver categorías sistema" ON categorias FOR SELECT USING (es_sistema = TRUE OR auth.uid() = user_id);
CREATE POLICY "Gestionar categorías propias" ON categorias FOR ALL USING (auth.uid() = user_id);

-- Función: crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, nombre)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nombre', 'Usuario'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: activar función al crear usuario
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
