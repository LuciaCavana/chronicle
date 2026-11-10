from pathlib import Path
import sys
root=Path(sys.argv[1] if len(sys.argv)>1 else '.').resolve()
app=root/'src/App.tsx'; libros=root/'src/pages/Libros.tsx'; motor=root/'src/pages/MotorLibros.tsx'
for p in (app,libros,motor):
    if not p.is_file(): raise SystemExit(f'No se encontró {p}. Ejecutá el script desde la raíz de Chronicle.')
updates={}
s=app.read_text(encoding='utf-8')
if "import MotorLibros from './pages/MotorLibros'" not in s:
    anchor="import NuevaPropuesta from './pages/NuevaPropuesta'"
    if anchor not in s: raise SystemExit('No se encontró import de NuevaPropuesta en App.tsx')
    s=s.replace(anchor,anchor+"\nimport MotorLibros from './pages/MotorLibros'",1)
if 'path="/biblioteca/libros/editor"' not in s:
    anchor='      <Route\n        path="/biblioteca/libros/nueva-propuesta"'
    if anchor not in s: raise SystemExit('No se encontró ruta nueva-propuesta en App.tsx')
    new='''      <Route
        path="/biblioteca/libros/editor"
        element={<ProtectedRoute><MotorLibros /></ProtectedRoute>}
      />
'''
    s=s.replace(anchor,new+anchor,1)
updates[app]=s
s=libros.read_text(encoding='utf-8')
if 'to="/biblioteca/libros/editor"' not in s:
    anchor='''            <Link
              to="/biblioteca/libros/nueva-propuesta"'''
    if anchor not in s: raise SystemExit('No se encontró enlace nueva-propuesta en Libros.tsx')
    new='''            <Link
              to="/biblioteca/libros/editor"
              className="libros-new-button"
            >
              <BookOpen size={18} />
              Editor de libros
            </Link>

'''
    s=s.replace(anchor,new+anchor,1)
# add admin access as well as proposals (same editor, server validates)
anchor='''        {activeTab === 'propuestas' && (
          <div className="libros-propuestas-header">'''
if anchor not in s: raise SystemExit('No se encontró sección propuestas en Libros.tsx')
updates[libros]=s
s=motor.read_text(encoding='utf-8')
old="const r=await guardarLibroMotor(form,id,revision);setId(r.id);setRevision(r.revision);setSeleccionado(null)"
new="const r=await guardarLibroMotor(form,id,revision);setId(r.id);setRevision(r.revision);const actualizados=await listarLibrosMotor();setSeleccionado(actualizados.find(x=>x.id===r.id) ?? null)"
if old in s: s=s.replace(old,new,1)
elif new not in s: raise SystemExit('No se encontró callback de guardado en MotorLibros.tsx')
updates[motor]=s
for p,s in updates.items():
    backup=p.with_suffix(p.suffix+'.bak-integracion')
    if not backup.exists(): backup.write_text(p.read_text(encoding='utf-8'),encoding='utf-8')
    p.write_text(s,encoding='utf-8')
    print('Actualizado:',p.relative_to(root))
print('Listo. Ejecutá npm run build para verificar.')
