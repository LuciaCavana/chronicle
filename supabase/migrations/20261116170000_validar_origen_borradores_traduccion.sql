CREATE OR REPLACE FUNCTION public.chronicle_validar_origen_traduccion()
RETURNS trigger LANGUAGE plpgsql SET search_path TO '' AS $$
DECLARE v_idioma text;
BEGIN
  IF NEW.tipo <> 'traduccion' THEN RETURN NEW; END IF;
  SELECT lv.idioma INTO v_idioma
  FROM public.libro_versiones lv JOIN public.libros l ON l.id=lv.libro_id
  WHERE lv.id=NEW.version_traduccion_origen_id AND lv.libro_id=NEW.libro_id AND l.estado='publicado';
  IF v_idioma IS NULL THEN
    RAISE EXCEPTION 'La versión de origen debe pertenecer a un libro publicado' USING errcode='23514';
  END IF;
  IF v_idioma=NEW.idioma THEN
    RAISE EXCEPTION 'La traducción debe tener un idioma distinto del original' USING errcode='23514';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS chronicle_validar_origen_traduccion ON public.propuestas;
CREATE TRIGGER chronicle_validar_origen_traduccion
BEFORE INSERT OR UPDATE OF tipo,libro_id,version_traduccion_origen_id,idioma
ON public.propuestas FOR EACH ROW EXECUTE FUNCTION public.chronicle_validar_origen_traduccion();
