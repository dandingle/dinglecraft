"""Waves 2-3 entity ids (imported by post_face.py). Release 1.0 removed the character faces; pgface_feltdan and fist_pg were
recoloured afterwards by tools/art/texpacks/r1_local_art.py, so run that again after re-posting them."""
ENTS = {
    'pgent_apron': ('obj', ['pgw2_r_apron', 'pgw2_apron'], {'crop': 'none'}),
    'pgent_sneakers': ('obj', ['pgw2_sneakers'], {'crop': (0.2, 0.06, 0.78, 1.0)}),
    'pgface_feltdan': ('obj', ['pgw2_feltdan'], {'crop': 'none'}),
    'fist_pg': ('obj', ['pgw2_r_fistpg', 'pgw2_fistpg'], {'crop': 'none'}),
    'pgmat_felt': ('local', ['pgw1_t_sleeve_hero'], {'fn': 'felt'}),
    'pgmat_fur': ('mat', ['pgw2_r_fur', 'pgw2_fur'], {}),
}
