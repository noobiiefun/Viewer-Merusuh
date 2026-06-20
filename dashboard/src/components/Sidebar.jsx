// dashboard/src/components/Sidebar.jsx
const LOGO_B64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAWDUlEQVR42u2bebRU1Z3vP7+9z1BV93JHIAoyKwZQkRg0AYeAGhMcoknEldcxb5kXkxY6Wel+r+2n8a3Vbdruji47GoxZHdu3TFrUaGzQKA4x4kgCglFBGQQELpfxAne+VXWG3/vjVNWtqlsXMW0nndd91jqr6ox779/+7t/v+xsO/Nf2n3uT32M7pqw9rfqVql8F4rLrf5SbAZzC7x/yHb93BNiyGSxsDS2Ok58OOkOUE1UYC9IkkEYA1X6FTlHaMWxVlbfD0NsI3YerhCFA9B9VALa8c57nnRTHXAJmAegsEWmtbLYK3Vq5ABTtEOR1JV5hrTyZy+W2Vi2n6D+KAIrwjAGs9S4VkWsFLkQkVbbSFYjKWpTkfEkNaEkKgq3om+qAwrOq+uMoyq+o1e4fSgClWbfWu8QYuQFkTtm0hoURGRSpaE2rwDDkV1WVWJIjp9RV0VfimFuiKPd0LeT9vgRQgqHv+5OjiFtF5AuF2Spob0nWrNQacNmBvJ+u1yI64uR9YpJm9GdOKH+VJbvz3yIE+R2fESB23dSXVfVOEWkpDLwMmjKIbGToIKX6QCt1QaIHqiQogEZFQajqQYnlm0Gc/VmhXf2gptP+DutdAbWuf4cg3xMkXYD64LqValklgBAxxBqgRKjGqCqqMbHGJeAYccoGXz6aoijEKIhAKMgIDF+01tbHcfRsWYP/LggwBYWTchz/QRG5HNUQxA5OcSXeVQRUMWIIogFUIeO1YMQOUfuCIYxzDOS7sNbBGBfVuKqDUokKUQWJAauqj4Rh7k+AsGrRfSgCKErWdRzvFyLmQlUNBHGH2rDBY0UxYgmiAUZnPsrnp9xFc2oCkcbJUpZkZWsBuY5Ydve9xqPvLiYbdmOMUyUEGWovk3MBIq6qPhmGuSsK+uCYloN8EIXnOP4yEbm8OPgiTIftnBhiDUnbRr49ax1vdzzKqn0/Lt2bz+dRwPc8VMExHpdM/HuMyfDj9RdgjVt4U/msl+vFCqEXhfBIGOYWFhhk9GHQaScxc/73XTelruPnXSelrpNSx/HVdVKanE+p6xaOC7vv1img557w5/qnM1cqoGJFrWsU0DuXfF8Xf/O6gk6xikEx6A2zt+vklnMUQT03o65T9l63vL2y/46f9M1NqWv975X3/VhIzNGUZOia1H8zRr6NagC4yewydKlpwaxVCX2EO4Z9fRsQDBmviTiAv/nr7zJj2mlcdMECzj1nHhpC2msAhUO5HTS6Y48yd2UWo4JM4aIaYuR6z3pfLOgD+7sKwABxitR4NXo3Sjz4MkGHyEBrsJsCVdMQi4sSoxqBKN3dXagqv3jiF7y1/k2MtURRwptEHWKNhhm0VgpGAJHCYpRSv2ORf4L0mMKD5ncRgAAaOrpERBqTlsUUZ1iGUyG1Zk2FOI4QDLEqxlhefvll7rprCddddx1f+PznCcM81loEKQxeaujg6kMtyV1K3RGDaiwiLY4T31GwXHLU9T0cxbXW/7SIXFYgH3YI4svtszColKoUVKQRxngoMda4BJrlnHPPZeHCKxnoH+DtDRtxrF9AVowVnygOK6MEWt6GlrHJMmtQ8ibEQTUSkSut9edFUW7lcGzROcoiMwZuGXx/OZuTMm9GqpaBlP4rihhha9cvWTjlIZrSE+gc2AkWbr/9NvK5gPUb1/KbNa+ChTCb48SmT9PoTKStd3XBDGqBTZa1rWU0mjJhS9WtyXYLMHc4ayDDz773WWPMisKitbWf1JLiK+oELc5B0XwVSNAFY/6Wj7V+le29L9Md7Oal/X9NNtfD8akzOWvM1xF18G0jk+rPZsXuP+fNw/fj2UzCEIf4CzpM1wsckZK/ESNi4lgviKLcr2qhQIZTfo7jrxCRz4BGqDhFEAzfER2im8odniDKMrH+XE7IfILTW65ha+9TpG0Tk+s/xeauJ+kJ9xFrwOauJziQfQfXpgskSIYqV5FKxA0RQElRhohYVX08DHOXH4sADBAXPLyNZUxPhmNhg5yvcnGUsCAGg0VECOIBojBkZuvVXDpuCesPL2d1xxL29a8reRnGWDxThxIRa1RBgkotlgtAyuBHmR4q3pBcz1pHTs5ms21llL6mM2SBWMReI2IWJMpPbNIFrSkzqdLSUrUQQs0RhnnCKF+C84HcW7y07x9ImVHUua3sH3hzUJWoEkY5ojgASah0NbakzPxRE3eliUpCaCJ+HOu2OI5eK47xqAhwnNRzIpyPaoTIEO1fqZW1zEkpu0UMsUaMTJ/EJ0YtQnBLgSHB0p3bhy+NBHEfxriknQZUYowIIkI26uLVA3fQHxxAsIkyRMv0wRB/YBANUPqvEEniOj8dhrkF1QiQGsNqdhx/m4g0F1SwHF39lKu95NgYiyrkg36+dPLPONS7lW1HVpFJNWIdwbU+/flOxqRmE0o/Bwc24jt1hHGARtCX7eLUUVeQ006e2vW/SHn1xERoHFdZo1qR9SEjUgRR1Y4wzE0GesqZmlM1+5HjpGaI0FzAq6kmdkPiGMnbS6IwxpDL92ONx5SpkwkDpd17iu7WN9hxoJcoN/j4yOOm051vZ8Phnw/a5RS0fqSBdskw3v00k0+cyPatuwDFc1OFblULYRgVlThNgoqKyEjHSU8Lw4E15UFVM3QB6SlDgo16FLagg61aa8nns5w+cxbvvLOenz/6IIeOHOAbX/0WW9e307ZtH5s2bubFF17h3p/8iJGto/joydNZ+sB9vPziKjZvepe27QfY9MYOzj/vs4Sa44VXnubXq1YxYcIEwigooEvL1I7UtmUVSjHh1SLxjGq4DCFCokypTRyHs72J6MUYwjCgpaWV5577JcsfW86N37mBhaNW8dMf/S3f/8n1TJlwMhMnjmfy5Cm0HJcmIo+xykBugJUvrOS9HdvZ+d4utu7YzKTgaiamLmLuWfP553+6jxUrVjBr1qyEUovUDgvU7lrpYhwz5X3dXsfxHyi4vYHr+Oq6vjqOX3B9q9zfsj2VSlzfr33t67q7bXcBgEYnN8xXx9RpGShL+6Un3KvnjPw/Na81+Cfo5MZ5CqjnpbW7u1vnzbtAAfX9TGUfqt3jodcC102p4/j3VU98+RIoQF6bixY2CWlJBfGtCbMyFM6Z80leXbUKEcH1Hfp0P3PHLML36vD8FKlUPZl0A67v0R3uJCuHcD2PTLqBdKoeceCSyXfw2YnfY3v3SlKpOvL5ATZs2MA5Z88pKHgpWIUaS1SHhiPLyEFz9RNDvEFVSddic0N5fyX04jg5efrMmaxZvQZVJYjzTGv4HJ8ZcyuOpIiikCgKCYIcxIYXD97M2sN3gxryQY4oinGpx6OeejmOtNuEkYRE/fb1NzjzrLPKzKwcPaalQ5eGUEjUHE0A1VR/kGIWMaA1TUI+yNPU2ML48eNZ89oaBJ8/m7qBOaOupzN7kP85fQdzR19PEGaRQuTXMxlck0awhFGOj7f8KTeddoRn2v+Kezefz7embeWiMbejqqz+zWtMnz4NYyxhGNWYfS0bcDU6ZFhdPsQKiNBPDTufoEiGRoI0MX2qIdNnTEdEWL9+A45x2HhkOXt63yCOLW8depj9A+vxPB9rDdaxGCsYa7DW4Hk+HcHbrD10Ly3+VMbUzebNQz/lva4XAWHturU0NzczfvwEwjCXIKDc9Ssea40QwmCfB45mBYonj5TFqmswTRki/SIczzxzNu172unsPEzKr+dXe25iZus1zGu5lcf2/I8kewBAribqtuSeYcvhZ7jmxFdpdqfyj5tGgQFrfd7duoW+vn5mzpzJjh3bEz0QS+XsU+0PDOnpkfc1g6q0SxXbKQFIa9ncwRNz5sxh7dp1GCOIgOdm2N77NAdyv0VDS1NjE7f83XcZO3YMUZTQ3iRkplhr2LZ1BzfeeANP7/oLGutH49gURgzGCLl8P5s3beITZ53FY48tG9QBtfMFFTGCUphCtf19AyIibCuXxhAcVYSkK9NeLc3N7N7dThwrjuugBATSxd7evYwfP4GVzz9Pd08PL7ywEs/1iTVx1gQIwjyXXLqAefPP41Pnz2Xv4X4ymQbiOMJxHLI5pae3l5bWliqnK1HQFWHz6hB6cb0btkbR+6TJHCc1t8ADoopw9JCQtF8KRxc5wOLF39TOzk5tbm6psOlnnflJ7erq1qX3L61p84u747j65JMrdN/e/Tp92ikV16ZMPlGjMNSLL750kAscLVzulPXTTcVJGD89+2gpweJUNzmOf7jwktgpkCG3SIRqkKCkcV9d19NnnnlG9+8/oDfffLMuWrRY7777bs3n83rzzd9VQF03pZl0vaZT9ZpOF/ZUvWbSI9RxPAX0rrt+qNlsVu+44w5dtGiR3nrrrdrb26v33feTEjEqTFJlfsKp2be4QIIOACOq1+0w7rD3rIi5MAmHYas9DWNMMi1xEr01xiTZyihERFi8eBGXf+5zNDQ20nHwIHf98Ic8/vhjZNIjCMMQRbHGEMVxyYeIooTiWmMYyPax8Mqr+Po3vs7I1lY6OztZ+sAD3HPPP+O6LsbYikiRKsRxXJmJHtQDEYJR1RVhmLvk/VLpBTrsfbsgtaA082UIKMLSdVPquenScfn/4XZrPTXGLd3vOH7pfPF510kN87ypaL98L0dEFUqLNPi6WnqvdkgMf2LssAkRr0gPk4i7IYpCZs+eTU93D5s2bUSBGTNmkE6nWbduHafPnEkul2fLu1uYNGkSp556Cr6fQuOYMIp44oknSadSzPrYLJ7/1fOk0xnmzv0kv/7Nanp7eph//nzeeONNgiDP/PnzqavLJHlDa/nN6tVs27aNM844g5NOPBFEcF2Xd7dsYdWqX+M4LmVlNmU6UgeC0EyFgd3VAZGjKEP/iUR5+EFRoik/UXZf/vJXdOfOnepYV1OpjLa3t+uVV16lgC5btlxvu+02BfT22/9ROzo69KGHHtLHH39cH3zwIW1pHqkNDU3a0dGh06efop+56LOqqnrZZZfryVOnaUdHhzY0NOrMmbM0l83qsmXL9ec/f1Qfe+xxvfDCi1RE9MYbvqPLli3XO++4U39w5w+0o6NDzz77XAUpKMdSrjBw3VTsOP6/Dqf8hk0eqrJEhIuLXpACURzhe2nuv/+nLFp0HV+79lrq6+rYtGkTjzzyMwB6unsYGMgCsKd9Dxs2vE1bWxuZTB1vv/02h48cASLuuedebrrpO2gcc/+/LOWqqxYCyr33/l+6u7twXZeOQ4do27UrCaiGIevWrkMVWlpbaGxswPM86keMoK1tN/19/UOdpEJpnSpLPkhmKAJMFOWeNcZfg8iZqEaC2CRdIhjj8GeLv8VLL68kn8sxd855uI5PEOZoGNFIJl2HwdLevofDhw8z5vgTcF2X2R+vZ/SoZRw4uJcf3LmEPXvb2Lx5MzNPO50333yLk6ZO4YSxEzDiYMQyauRoRo0aharguJaZp8/khZUrOe3UU9ndtoelS5ey5K676O7uYf2G9biOVy6AJJ4Z6yuFzJD5IJkhIVGsNxrDc+WMMopjMDGv//Y1rlr4JfL5PBs3b8C6BmMsf/P3N9Db10tMxPpNr1O3oo6B4AhilDAI6B44gGM99u7bzfwL5tHfmyOXz/In/30hzSNGsXffbgDe2rSaq66+gtaG4xkIusl4jezfvx8l5ubv3syu3TvYtWM3cz55DpddcRENTRk6D/dijK1gPypy49FqIeT9SuAcx39URD6vBRTEGtGaOonm1EQ2H0pK9iY3f4pc1M2R7HtM8M9HxFCXGcG+zndpy77EWHMBvmnAGg9b38OWrqcZV38mB7t2008bo+tORnMpDoZvcnLLAuqd41CN2XfoPfbELzKS2XTwGgBTmubxXudaRvoTwc1xoHcLPuNoyjTTkduY1BgRh4g4qvpQGOa+dDTTZ9+veiSOvVeM0WsESYlYDaOsTG+6nK9OeYht2VfxHI+/mP4ah/Jt9AT7uGbaL3A8h+NTpxHZXrqjNq6d8Uu8ehiRGcGnPnIT23p/yelNX6F1xDh29a7ilOaFnDb6Cg6H27h60jOoxIytmwmpXg4F7/LVU5azpfcJBoJuLp9wD53xJmaNvJoTMmfSld/Dgkm30OAdx9bO53CsH4MaRQ+FoXMZBANHi2werYKiUA8w0K7G+4aoPJykmjBx6LHmwBN8ouF/40ia1fuWkw+UKIro6D3E/t73SJsmdnatJQjzdPX20tefpcn5GPu72unMthGFHmFoEHXRyCWXE44M7OL1Qz8l1CxZ08hoczZED9LVk4XIx4pHPi+EQUR3fxfTmi5mVrOhmRnsyq0tBixiBEdj/Rr07T8m4nOULQKcKJ9/BOvf5hj+EpEgjAL3ncNP0RltImVbEHVpdMcRkaOr7xBe/BFs3MTx3lw6w+3s7XuL5zuuZ5x/LjPrr0MVtvc8y+zGv2TU8R9nhBnHa123kXZasFErQoCjjQRxF/m4j909a7ig9UcEcR9hHjpymxjvX8QLe7/H5p6H+VjTNwvxAQkFXI31lijKP1YYX/hhFElZIHQc/xER+SJKYMVzc3E3GoHBT6o/iHCkDotXsJ4Bee1FCv1QE+HaNKgSxFlck8ZIUtUSaD8SefimEUWJ45g8hzHGIY5DUqYFVSFPV1IFQwprDUmxmSUmDFB1FX2gUC53TEVSH6hM7gzOsK87v10+MXXegn3514Nc2Ocef9xY6usz5IN8IVyVL6ZT0DipbDXGkM31kT2YIuO2kI/7ccQnjLP4Th39QSfdcRvjThhHNj+AtZZUKgVq2L9vPy0tLQzk+vBclyCIE3NHRFdnF339Pbg2Exyf+ri7s++l5Rp/4YvwiB5rmZxzjAJQgLWsDSWUyxvt1KWN9ZOufLf7icg6GD+Vkrq6ETiuJZ/LIwLWOuzdu4fWkSNxrEs2dDl4UGhxp5Knh978flr8sbiSwff30p9rp7m5pRRh8nyfMMhzqKOD5uYm6sN6XNdjYKCfVCqFYx3CKIijrKcn1l/suox4YEf8wleUh2OpVan1IW2lz17SbsutnptRwSqYQMQmkXQcJTmnRhwVcRSMCo5ax1FxULGocYyKg2JR6zoFJ8eWnk0GYNVar/Q8WLXGLRzbIHGgMpp2W2+pXUz071wsbYy70Fq7RJDRmgBeFbWDgXStiFkmGS0pJHAr8/xJNUl1IF4rb0soeiSCCGJijfep6uIoyv/r76tYunxJWNV4Qxw7D4vR40TkNMAUqp7jQUHp0BoLKEunF3PLQ69XJOwgTuodxKKIov8ShuYq1dyaMoX3h/xgwv+0gRsxcl5ZjU5YSK+bityKHktij+I3AgrilN3+fKz6d4WaH/gDfTBRc0kUBHGRCNcKfAaRuvLi8cGOliqO0EIsX4pB/gQFtuL7EtVehadU+XEU5Z4rr2b5tyq7D/ujqVKHfN+fFEUsABYAZ4jIR47h85Byf3yfwlpghePIimw2u7O6eJsPafY+7K3GZ3M0Ok76oyLxdGKmqMhY0OZirk7RLMgRUd2NYZuqeScMBzYB3TX0VcQfyfaf9sPJ4doxQ4v6amby4P+TT2f/a/tj2P4fEVH/nTsQXpQAAAAASUVORK5CYII='

const NAV = [
  { id: 'dashboard', icon: '📊', label: 'Dashboard' },
  { id: 'effects',   icon: '⚡', label: 'Efek' },
  { id: 'testing',   icon: '🧪', label: 'Testing Area' },
  { id: 'overlay',   icon: '📺', label: 'Overlay Editor' },
  { id: 'logs',      icon: '📋', label: 'Log Donasi' },
  { id: 'ahk',       icon: '🖥️', label: 'AHK Controller' },
  { id: 'vjoy',      icon: '🕹️', label: 'vJoy Controller' },
  { id: 'secrets',   icon: '🔐', label: 'Secrets & Config' },
  { id: 'config',    icon: '⚙️',  label: 'Konfigurasi' },
]

export default function Sidebar({ page, onNav, connected }) {
  return (
    <aside style={{
      width: 210, minHeight: '100vh',
      background: 'var(--surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      padding: '0', flexShrink: 0,
    }}>
      {/* Logo area */}
      <div style={{
        padding: '18px 16px 14px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <img src={LOGO_B64} alt="Viewer Merusuh"
          style={{ width:40, height:40, borderRadius:'50%', flexShrink:0,
                   boxShadow:'0 0 12px rgba(124,58,237,0.4)' }} />
        <div>
          <div style={{ fontSize:15, fontWeight:800, letterSpacing:'-0.02em', lineHeight:1.2 }}>
            Viewer<br/>
            <span style={{ color:'var(--primary)' }}>Merusuh</span>
          </div>
        </div>
      </div>

      {/* Status */}
      <div style={{ padding:'8px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:6 }}>
        <div style={{
          width:7, height:7, borderRadius:'50%',
          background: connected ? 'var(--green)' : 'var(--red)',
          boxShadow:  connected ? '0 0 6px var(--green)' : 'none',
          flexShrink: 0,
        }} />
        <span style={{ fontSize:11, color:'var(--text-2)' }}>
          {connected ? 'Server Terhubung' : 'Server Terputus'}
        </span>
      </div>

      {/* Nav */}
      <nav style={{ flex:1, paddingTop:6, overflowY:'auto' }}>
        {NAV.map(n => (
          <button key={n.id} onClick={() => onNav(n.id)} style={{
            width:'100%', padding:'9px 16px',
            background: page===n.id ? 'rgba(124,58,237,0.15)' : 'transparent',
            border: 'none',
            borderLeft: page===n.id ? '3px solid var(--primary)' : '3px solid transparent',
            color: page===n.id ? 'var(--text)' : 'var(--text-2)',
            cursor:'pointer', textAlign:'left',
            fontSize:13, fontWeight: page===n.id ? 600 : 400,
            display:'flex', alignItems:'center', gap:10,
            transition:'all 0.15s',
          }}>
            <span style={{ fontSize:15 }}>{n.icon}</span>
            <span>{n.label}</span>
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div style={{
        padding:'10px 16px',
        borderTop:'1px solid var(--border)',
        display:'flex', alignItems:'center', gap:8,
      }}>
        <img src={LOGO_B64} alt="" style={{ width:20, height:20, borderRadius:'50%', opacity:.5 }} />
        <span style={{ fontSize:10, color:'var(--text-3)' }}>v1.0.0</span>
      </div>
    </aside>
  )
}
