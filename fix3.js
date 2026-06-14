const fs = require('fs');
const path = 'd:/projects/galerievarinchie_artist/src/app/admin/add-product/page.tsx';
let lines = fs.readFileSync(path, 'utf8').split('\n');

const startIdx = 809; // line 810 is index 809
const endIdx = 824; // line 824 is index 823

const replacement = `                        const allUrls = folderImgs.map(img => img.url).filter(url => !currentImgs.includes(url));
                        setPickerSelected(prev => {
                          const next = new Set(prev);
                          allUrls.forEach(url => next.add(url));
                          return next;
                        });
                      }} style={{ fontSize: '13px', padding: '6px 12px', border: '1px solid var(--color-border)', borderRadius: '4px', background: 'none', cursor: 'pointer', fontWeight: 600 }}>Select All in Folder</button>
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
                    {folders.filter(f => (pickerViewingFolderId ? f.parentId === pickerViewingFolderId : !f.parentId)).map(folder => (
                      <div key={folder.id} onClick={() => { setPickerViewingFolderId(folder.id); setPickerFolderPath([...pickerFolderPath, { id: folder.id, name: folder.name }]); }} style={{ border: '2px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', cursor: 'pointer' }}>
                        <div style={{ width: '100%', height: '150px', background: 'var(--color-bg-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px' }}>
                          ??
                        </div>
                        <div style={{ padding: '8px 10px' }}>
                          <div style={{ fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={folder.name}>
                            {folder.name}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>{(finishedImages.filter(i => i.folderId === folder.id).length + folders.filter(f => f.parentId === folder.id).length)} items</div>
                        </div>
                      </div>
                    ))}
                    
                    {finishedImages.filter(img => (pickerViewingFolderId ? img.folderId === pickerViewingFolderId : !img.folderId)).map(renderImageCard)}
                    
                    {folders.filter(f => (pickerViewingFolderId ? f.parentId === pickerViewingFolderId : !f.parentId)).length === 0 && finishedImages.filter(img => (pickerViewingFolderId ? img.folderId === pickerViewingFolderId : !img.folderId)).length === 0 && (
                       <div style={{ gridColumn: '1 / -1', padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>Folder is empty.</div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>

          {/* Modal Footer */}
          <div style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--color-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
            background: 'var(--color-bg-light)',
          }}>
            <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
              {pickerSelected.size > 0 ? \`\${pickerSelected.size} image\${pickerSelected.size !== 1 ? 's' : ''} selected\` : 'Click images to select'}
            </span>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowFramePicker(false)}
                style={{
                  padding: '9px 20px', border: '1.5px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)', background: 'none',
                  cursor: 'pointer', fontSize: '14px',
                }}
              >Cancel</button>
              <button
                id="fc-picker-confirm-btn"
                type="button"
                disabled={pickerSelected.size === 0}
                onClick={confirmPickerSelection}
                style={{
                  padding: '9px 22px',
                  background: pickerSelected.size === 0 ? 'var(--color-border)' : 'var(--color-accent)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  cursor: pickerSelected.size === 0 ? 'default' : 'pointer',
                  fontWeight: 700,
                  fontSize: '14px',
                  transition: 'background 0.2s',
                }}
              >
                Add {pickerSelected.size > 0 ? \`\${pickerSelected.size} \` : ''}Image{pickerSelected.size !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    <div className="page-content fade-in">
      <div className="container" style={{ maxWidth: '760px' }}>
        <div style={{ marginBottom: 'var(--space-xl)' }}>
          <Link href="/admin/content" className="text-sm text-muted">? Back to Website Content</Link>
        </div>
        <h1 style={{ fontSize: '22px', fontWeight: 600, marginBottom: 'var(--space-xl)' }}>Add New Product</h1>

        {success && <div className="alert alert-success">Product added successfully! Redirecting...</div>}
        {error && <div className="alert alert-error">{error}</div>}

        {categories.length === 0 ? (
          <div className="empty-state">
            <h2>No Categories Yet</h2>
            <p>You need to <Link href="/admin/content/categories" style={{ color: 'var(--color-accent)' }}>create a category</Link> and a <Link href="/admin/content/subcategories" style={{ color: 'var(--color-accent)' }}>subcategory</Link> before adding products.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>

            {/* -- Category -- */}
            <div className="profile-card">
              <h3>Category</h3>
              <div className="form-group">
                <label>Category</label>
                <select value={categoryId} onChange={e => handleCategoryChange(e.target.value)}>
                  {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Sub-Category</label>
                {subCategories.length === 0 ? (
                  <p className="text-sm text-muted">No subcategories yet. <Link href="/admin/content/subcategories" style={{ color: 'var(--color-accent)' }}>Add one ?</Link></p>
                ) : (
                  <select value={subCategoryId} onChange={e => setSubCategoryId(e.target.value)}>
                    {subCategories.map(sub => <option key={sub.id} value={sub.id}>{sub.name}</option>)}
                  </select>
                )}
              </div>
            </div>

            {/* -- Artist -- */}
            <div className="profile-card">
              <h3>Artist</h3>
              <div className="form-group">
                <label>Assign to Artist (optional)</label>
                <select value={artistProfileId} onChange={e => setArtistProfileId(e.target.value)}>
                  <option value="">— No artist —</option>
                  {artists.map(a => <option key={a.id} value={a.id}>{a.fullName}</option>)}
                </select>
              </div>
            </div>

            {/* -- Product Details -- */}
            <div className="profile-card">
              <h3>Product Details</h3>
              <div className="form-group">
                <label>Title</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} required placeholder="Product title" />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} required placeholder="Product description" rows={4} />
              </div>
              <div className="form-group">
                <label>Product Images</label>
                <p className="text-xs text-muted" style={{ marginTop: '4px' }}>Images are uploaded per combination below in the Pricing section. Select a combination row to manage its images.</p>
              </div>
            </div>`;

lines.splice(startIdx, endIdx - startIdx, replacement);
fs.writeFileSync(path, lines.join('\n'), 'utf8');
console.log('Fixed via line numbers!');
