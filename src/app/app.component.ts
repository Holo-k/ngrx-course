import {ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {AlbumService} from './services/apis/album.service';
import {AlbumInfo, Category, Track} from './services/apis/types';
import {CategoryService} from './services/business/category.service';
import {Router} from '@angular/router';
import {combineLatest} from 'rxjs';
import {WindowService} from './services/tools/window.service';
import {UserService} from './services/apis/user.service';
import {storageKeys} from './configs';
import {ContextService} from './services/business/context.service';
import {MessageService} from './share/components/message/message.service';
import {PlayerService} from './services/business/player.service';
import {animate, style, transition, trigger} from '@angular/animations';
import {select, Store} from '@ngrx/store';
import {ContextStoreModule} from './store/context';
import {getUser, selectContextFeature} from './store/context/selectors';
import {setUser} from './store/context/action';

@Component({
  selector: 'xm-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('fadePlayer', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('.2s', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('.2s', style({ opacity: 0 }))
      ])
    ])
  ]
})
export class AppComponent implements OnInit {
  currentCategory: Category;
  categories: Category[] = [];
  categoryPinyin = '';
  subCategory: string[] = [];
  showLogin = false;
  showPlayer = false;
  playerInfo: {
    trackList: Track[];
    currentIndex: number;
    currentTrack: Track;
    album: AlbumInfo;
    playing: boolean;
  };
  constructor(
    private albumServe: AlbumService,
    private cdr: ChangeDetectorRef,
    private categoryServe: CategoryService,
    private router: Router,
    private winServe: WindowService,
    private userServe: UserService,
    private contextServe: ContextService,
    private messageServe: MessageService,
    private playerServe: PlayerService,
    private store$: Store<ContextStoreModule>
  ) {
    this.store$.select(selectContextFeature).pipe(select(getUser)).subscribe(user => {
      console.log('context user', user);
    });
  }

  setUser(): void {
    this.store$.dispatch(setUser({
      phone: '1111',
      name: '张三',
      password: 'aaa'
    }));
  }

  ngOnInit(): void {
    if (this.winServe.getStorage(storageKeys.remember)) {
      this.userServe.userInfo().subscribe(({ user, token }) => {
        this.contextServe.setUser(user);
        this.winServe.setStorage(storageKeys.auth, token);
      }, error => {
        console.error(error);
        this.clearStorage();
      });
    }
    this.init();
    this.watchPlayer();
  }
  private watchPlayer(): void {
    combineLatest(
      this.playerServe.getTracks(),
      this.playerServe.getCurrentIndex(),
      this.playerServe.getCurrentTrack(),
      this.playerServe.getAlbum(),
      this.playerServe.getPlaying()
    ).subscribe(([trackList, currentIndex, currentTrack, album, playing]) => {
      // console.log('trackList', trackList);
      this.playerInfo = {
        trackList,
        currentIndex,
        currentTrack,
        album,
        playing
      }
      if (trackList.length) {
        this.showPlayer = true;
        this.cdr.markForCheck();
      }
    });
  }

  changeCategory(category: Category): void {
    this.router.navigateByUrl('/albums/' + category.pinyin);
  }
  private init(): void {
    combineLatest(
      this.categoryServe.getCategory(),
      this.categoryServe.getSubCategory()
    ).subscribe(([category, subCategory]) => {
      // console.log('get category', category);
      if (category !== this.categoryPinyin) {
        this.categoryPinyin = category;
        if (this.categories.length) {
          this.setCurrentCategory();
        }
      }
      this.subCategory = subCategory;
    });
    this.getCategories();
  }

  private getCategories(): void {
    this.albumServe.categories().subscribe(categories => {
      this.categories = categories;
      this.setCurrentCategory();
      this.cdr.markForCheck();
    });
  }

  private setCurrentCategory(): void {
    this.currentCategory = this.categories.find(item => item.pinyin === this.categoryPinyin);
  }

  logout(): void {
    this.userServe.logout().subscribe(() => {
      this.contextServe.setUser(null);
      this.clearStorage();
      this.messageServe.success('退出成功');
    });
  }
  private clearStorage(): void {
    this.winServe.removeStorage(storageKeys.remember);
    this.winServe.removeStorage(storageKeys.auth);
  }

  closePlayer(): void {
    this.playerServe.clear();
    this.showPlayer = false;
  }
}
