/**
 * Настройки приложения
 */
var config = module.exports = {

  /**
   * Название приложения ( пока что используется только для логирования )
   *
   * @type {String}
   */
  name                : 'blog',

  /**
   * Корневая директория приложения, в ней по умолчанию ищутся директории с моделями, контроллерами, вьюшками,
   * компонентами, а также относительно нее задаются другие пути в конфигурационном файле
   *
   * @type {String}
   */
  base_dir            : __dirname + '/../',

  /**
   * Контроллер использующийся по умолчанию там где не указан явно. Важно: при подключении к приложению по любому из
   * протоколов, у этого контроллера вызывается действие client_connect, где можно например произвести авторизацию
   * клиента по куки. Имя контроллера должно совпадать с названием файла, в котором он описан.
   *
   * @type {String}
   */
  default_controller  : 'site',

  /**
   * Здесь переопределена стандартная директория нахождения вьюшек, чтобы в папку views можно было также сложить
   * клиентские скрипты и стили и они не обрабатывались бы шаблонизатором
   *
   * @type {String}
   */
  views_folder        : 'views/templates',

  /**
   * Если значение true - вьюшки подгружаются один раз при создании приложения и больше никогда не проверяются на
   * изменения, если false - измененные вьюшки перезагружаются каждый раз при обращении к ним
   *
   * @type {Boolean}
   */
  cache_views         : false,

  /**
   * Настройки компонента отвечающего за перенаправление запросов и генерацию запросов
   *
   * @type {Object}
   */
  router : {

    /**
     * Правила перенаправления запросов, ключи запрашиваемых УРЛ, с возможностью указания параметров, значения -
     * путь к действию в виде контроллер.действие Также тут можно указать какие типы запросов могут быть обработаны
     * для данного действия. 'post' - для HTTP POST, 'get' - для HTTP GET, 'delete' - для HTTP DELETE,
     * 'ws' - для запроса через WebSocket, если не указано - то любой
     *
     * @type {Object}
     */
    rules     : {
      // главная
      ''                      : 'site.index',

      // запрос на регистрацию пользователя
      'register'              : 'site.register        | post',

      // запрос на логин пользователя
      'login'                 : 'site.login           | post',

      // запрос на логаут пользователя
      'logout'                : 'site.logout',

      // запрос на создание нового топика
      'new_topic'             : 'site.create_topic',

      // просмотр топика, примутся УРЛ вида /topic/2
      'topic/<topic_id:\\d+>' : 'site.view_topic',

      // запрос на добавления комментария
      'comment'               : 'site.comment         | post'
    }
  },

  /**
   * Компоненты, загружаемые до инициализации ядра приложения
   * log_router - чтобы видеть этапы инициализации ядра
   * db - для инициализации моделей, которые используют доступ к базе данных
   *
   * @type {Array}
   */
  preload_components : [ 'log_router', 'db' ],

  /**
   * Настройка подключаемых компонентов. Здесь указываются как компаненты autodafe, так и пользовательские. Ключами
   * всегда является название подключаемого компонентка ( для пользовательских компонентов это название файла ), а
   * значениями - настройки для компонента. Если для компонента не надо передавать настройки, нужно просто указать true
   *
   * @type {Object}
   */
  components : {

    // Пользовательский компонент my_tools, находится в components/my_tools.js
    my_tools : true,

    // компонент управляющий правами пользователей
    users    : true,

    // http сервер
    http                : {
      port            : 3000,

      // здесь указываются директории в которых ищутся файлы
      root_folders    : {
        js       : 'views/js',
        css      : 'views/css'
      }
    },

    // настройки логгера
    log_router          : {
      routes : {
        console : {
          levels : [ 'trace', 'info', 'warning', 'error' ]
        }
      }
    },

    // настройки подключения к базе данных
    db : {
      type      : 'mysql',
      user      : 'test',
      password  : 'test',
      database  : 'autodafe_demo_blog',
      host      : 'localhost'
    }
  }
};