-- Adiciona colunas de resultado do teste ao vocational_profiles
ALTER TABLE vocational_profiles
  ADD COLUMN IF NOT EXISTS top_areas              text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS recommended_professions text[] DEFAULT '{}';
